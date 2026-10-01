import { DateTime } from 'luxon';
import db from '@adonisjs/lucid/services/db';
import type { UUID } from 'node:crypto';
import fs from 'node:fs/promises';
import edge from 'edge.js';
import QRCode from 'qrcode';
import logger from '@adonisjs/core/services/logger';
import SchedulingInvite from '#models/SchedulingInviteModel';
import Patient from '#models/PatientModel';
import Professional from '#models/ProfessionalModel';
import Procedure from '#models/ProcedureModel';
import Exam from '#models/ExamModel';
import User from '#models/UsersModel';
import Appointment from '#models/AppointmentModel';
import ScheduleSlot from '#models/ScheduleSlotModel';
import IdempotencyKey from '#models/IdempotencyKeyModel';
import AvailabilityService, { toUtcDateTime } from '#services/availability-service';
import type { DayAvailability, FindAvailabilityParams } from '#services/availability-service';
import type {
  IdentifyResult,
  ProfessionalDto,
  PublicSchedulingServiceDeps,
  RegisterResult,
  SchedulingContextDto,
  ServiceDto,
} from '../interfaces/public-scheduling-service.types.js';
import { buildIcs } from '../utils/ics.js';
import { renderPdf } from '../utils/html-to-pdf.js';
import { appointmentStatusLabel } from '../utils/appointment-status.js';
import { ApiException } from '../utils/api-error.js';
import { isValidCpf, normalizeCpf } from '../utils/cpf.js';
import { maskBirthDate, maskName } from '../utils/masking.js';
import {
  APPOINTMENT_STATUS_CANCELLED,
  APPOINTMENT_STATUS_CONFIRMED,
  APPOINTMENT_INACTIVE_STATUSES,
  IDEMPOTENCY_SCOPE_APPOINTMENT,
  IDEMPOTENCY_WINDOW_HOURS,
  PUBLIC_SCHEDULING_PREFIX,
  SCHEDULE_SLOT_BLOCKED_STATUSES,
  DEFAULT_CANCEL_WINDOW_HOURS,
} from '../utils/scheduling-constants.js';

const DEFAULT_TIMEZONE = process.env.CLINIC_TZ ?? 'America/Sao_Paulo';
const CANCEL_WINDOW_HOURS = Number(process.env.CANCEL_WINDOW_HOURS ?? DEFAULT_CANCEL_WINDOW_HOURS);

/**
 * Orquestra os fluxos públicos de auto-agendamento por token.
 *
 * Todas as rotas já passaram por `validateSchedulingToken`, então o
 * `invite` recebido é válido (não revogado, não usado, não expirado).
 * Identidade do paciente é amarrada ao convite (`invite.patient_id`)
 * para que o `POST /appointments` não precise receber `patient_id`.
 */
export default class PublicSchedulingService {
  private readonly patientModel: any;
  private readonly professionalModel: any;
  private readonly procedureModel: any;
  private readonly examModel: any;
  private readonly userModel: any;
  private readonly appointmentModel: any;
  private readonly scheduleSlotModel: any;
  private readonly idempotencyKeyModel: any;
  private readonly availabilityService: {
    findAvailability(params: FindAvailabilityParams): Promise<DayAvailability[]>;
  };
  private readonly database: { transaction(): Promise<any> };

  constructor(deps: PublicSchedulingServiceDeps = {}) {
    this.patientModel = deps.patientModel ?? Patient;
    this.professionalModel = deps.professionalModel ?? Professional;
    this.procedureModel = deps.procedureModel ?? Procedure;
    this.examModel = deps.examModel ?? Exam;
    this.userModel = deps.userModel ?? User;
    this.appointmentModel = deps.appointmentModel ?? Appointment;
    this.scheduleSlotModel = deps.scheduleSlotModel ?? ScheduleSlot;
    this.idempotencyKeyModel = deps.idempotencyKeyModel ?? IdempotencyKey;
    this.availabilityService = deps.availabilityService ?? new AvailabilityService({});
    this.database = deps.database ?? db;
  }

  /**
   * Contexto do link: clínica, expiração, restrições do convite e
   * paciente identificado (mascarado). Nunca expõe dados completos.
   */
  async getContext(invite: SchedulingInvite): Promise<SchedulingContextDto> {
    const clinic = await this.userModel.find(invite.clinic_id);

    if (!clinic) {
      throw new ApiException(404, 'CLINIC_NOT_FOUND', 'Clínica não encontrada.', {});
    }

    let patient: { id: string; name_masked: string } | null = null;
    if (invite.patient_id) {
      const found = await this.patientModel.find(invite.patient_id);
      if (found) {
        patient = { id: String(found.id), name_masked: maskName(found.name) };
      }
    }

    const appointment = invite.patient_id ? await this.findNextPatientAppointment(invite) : null;

    return {
      clinic: {
        id: String(clinic.id),
        name: clinic.name,
        phone: clinic.phone ?? undefined,
        site_page: clinic.site_page ?? undefined,
        logo: clinic.logo ?? undefined,
      },
      expires_at: invite.expires_at.toISO()!,
      allowed_professionals: invite.professional_id ? [String(invite.professional_id)] : null,
      allowed_procedures: invite.procedure_ids ?? null,
      allowed_exams: invite.exam_ids ?? null,
      patient,
      appointment,
    };
  }

  private async findNextPatientAppointment(invite: SchedulingInvite) {
    const appointment = await this.appointmentModel
      .query()
      .where('patient_id', invite.patient_id)
      .whereNull('deleted_at')
      .whereNotIn('status', APPOINTMENT_INACTIVE_STATUSES)
      .orderBy('start_time', 'asc')
      .first();

    if (!appointment) return null;

    return {
      id: String(appointment.id),
      professional_id: appointment.professional_id ?? null,
      exam_id: appointment.exam_id ?? null,
      procedure_id: appointment.procedure_id ?? null,
      schedule_slot_id: appointment.schedule_slot_id ?? null,
      start_time: this.toIso(appointment.start_time),
      end_time: this.toIso(appointment.end_time),
      status: appointment.status ?? null,
      notes: appointment.notes ?? null,
      ics_url: `${PUBLIC_SCHEDULING_PREFIX}/${invite.token}/appointments/${appointment.id}/ics`,
      cancel_url: `${PUBLIC_SCHEDULING_PREFIX}/${invite.token}/appointments/${appointment.id}/cancel`,
    };
  }

  /**
   * Identifica um paciente por CPF, devolvendo dados mascarados.
   * Nunca retorna e-mail, telefone, endereço ou nome completo.
   */
  async identifyPatient(invite: SchedulingInvite, cpfRaw: string): Promise<IdentifyResult> {
    const cpf = normalizeCpf(cpfRaw);

    if (!isValidCpf(cpf)) {
      throw new ApiException(422, 'CPF_INVALID', 'CPF inválido.', {});
    }

    const patient = await this.patientModel.query().where('document', cpf).whereNull('deleted_at').first();

    if (!patient) {
      return { exists: false };
    }

    await this.tiePatient(invite, String(patient.id));

    return {
      exists: true,
      patient: {
        id: String(patient.id),
        name_masked: maskName(patient.name),
        birth_date_masked: patient.birth_date ? maskBirthDate(patient.birth_date) : null,
      },
    };
  }

  /**
   * Pré-cadastra um paciente. Se o CPF já existir → `409 PATIENT_EXISTS`
   * e o front volta para a etapa de identify.
   */
  async registerPatient(
    invite: SchedulingInvite,
    payload: { cpf: string; name: string; email: string; phone: string; birth_date: string },
  ): Promise<RegisterResult> {
    const cpf = normalizeCpf(payload.cpf);

    if (!isValidCpf(cpf)) {
      throw new ApiException(422, 'CPF_INVALID', 'CPF inválido.', {});
    }

    const existing = await this.patientModel.query().where('document', cpf).whereNull('deleted_at').first();

    if (existing) {
      throw new ApiException(409, 'PATIENT_EXISTS', 'CPF já cadastrado.', {});
    }

    let patient: any;
    try {
      patient = await this.patientModel.create({
        name: payload.name.trim(),
        document: cpf,
        email: payload.email.trim(),
        phone: payload.phone.trim(),
        birth_date: DateTime.fromISO(payload.birth_date),
      });
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new ApiException(409, 'PATIENT_EXISTS', 'CPF já cadastrado.', {});
      }
      throw error;
    }

    await this.tiePatient(invite, String(patient.id));

    return { patient_id: String(patient.id) };
  }

  /**
   * Lista os profissionais permitidos pelo convite. Sem restrição,
   * lista apenas quem possui agenda (slots futuros).
   */
  async listProfessionals(invite: SchedulingInvite): Promise<{ data: ProfessionalDto[] }> {
    if (invite.professional_id) {
      const professional = await this.professionalModel.query().where('id', String(invite.professional_id)).whereNull('deleted_at').first();

      return { data: professional ? [this.toProfessionalDto(professional)] : [] };
    }

    const professionals = await this.professionalModel
      .query()
      .whereNull('deleted_at')
      //TODO: corriogir rotina de slots
      // .whereHas('scheduleSlots', (query: any) => {
      //   query.where('start_time', '>', DateTime.now().toUTC().toISO());
      // })
      .orderBy('name', 'asc');

    return { data: professionals.map((professional: any) => this.toProfessionalDto(professional)) };
  }

  /**
   * Lista procedimentos e exames permitidos para um profissional,
   * respeitando a whitelist do convite.
   */
  async listProcedures(invite: SchedulingInvite, professionalId: string): Promise<{ procedures: ServiceDto[]; exams: ServiceDto[] }> {
    await this.assertProfessionalAllowed(invite, professionalId);

    const professional = await this.professionalModel.query().where('id', professionalId).whereNull('deleted_at').first();

    if (!professional) {
      throw new ApiException(404, 'PROFESSIONAL_NOT_FOUND', 'Profissional não encontrado.', {});
    }

    await professional.load('procedures', (query: any) => {
      query.whereNull('deleted_at');
      if (invite.procedure_ids?.length) {
        query.whereIn('procedures.id', invite.procedure_ids);
      }
    });
    await professional.load('exams', (query: any) => {
      query.whereNull('deleted_at');
      if (invite.exam_ids?.length) {
        query.whereIn('exams.id', invite.exam_ids);
      }
    });

    return {
      procedures: professional.procedures.map((procedure: any) => ({
        id: String(procedure.id),
        name: procedure.name,
        description: procedure.description ?? undefined,
        duration_minutes: procedure.duration_minutes ?? undefined,
      })),
      exams: professional.exams.map((exam: any) => ({
        id: String(exam.id),
        name: exam.name,
        type: exam.type ?? undefined,
        specialty: exam.specialty ?? undefined,
        duration_minutes: exam.duration_minutes ?? undefined,
      })),
    };
  }

  /**
   * Disponibilidade do profissional no intervalo, respeitando a duração
   * do procedimento/exame selecionado (ou sem filtro de duração).
   */
  async findAvailability(
    invite: SchedulingInvite,
    query: {
      professional_id: string;
      procedure_id?: string;
      exam_id?: string;
      from: string;
      to: string;
    },
  ): Promise<DayAvailability[]> {
    await this.assertProfessionalAllowed(invite, query.professional_id);

    const professional = await this.professionalModel.query().where('id', query.professional_id).whereNull('deleted_at').first();

    if (!professional) {
      throw new ApiException(404, 'PROFESSIONAL_NOT_FOUND', 'Profissional não encontrado.', {});
    }

    const procedure = query.procedure_id ? await this.findProcedure(query.procedure_id) : null;
    const exam = query.exam_id ? await this.findExam(query.exam_id) : null;
    const durationMinutes = procedure?.duration_minutes ?? exam?.duration_minutes ?? null;

    const fromDate = DateTime.fromISO(query.from, { zone: DEFAULT_TIMEZONE }).startOf('day').toJSDate();
    const toDate = DateTime.fromISO(query.to, { zone: DEFAULT_TIMEZONE }).endOf('day').toJSDate();

    return this.availabilityService.findAvailability({
      professionalId: query.professional_id,
      procedureDurationMinutes: durationMinutes,
      from: fromDate,
      to: toDate,
      timezone: DEFAULT_TIMEZONE,
    });
  }

  /**
   * Cria o agendamento em uma transação, revalidando o slot com lock
   * (`FOR UPDATE`) e aplicando idempotência pelo header `Idempotency-Key`.
   */
  async createAppointment(
    invite: SchedulingInvite,
    payload: {
      professional_id: string;
      procedure_id?: string;
      exam_id?: string;
      schedule_slot_id: string;
      start_time: string;
      end_time: string;
      notes?: string;
    },
    idempotencyKey?: string,
  ): Promise<{ isReplay: boolean; statusCode: number; response: Record<string, unknown> }> {
    if (!invite.patient_id) {
      throw new ApiException(422, 'PATIENT_NOT_IDENTIFIED', 'Identifique-se antes de agendar.', {});
    }

    if (payload.procedure_id && payload.exam_id) {
      throw new ApiException(400, 'BAD_REQUEST', 'Informe apenas procedimento ou exame.', {});
    }

    if (idempotencyKey) {
      const replay = await this.getReplay(idempotencyKey);
      if (replay) {
        return { isReplay: true, statusCode: replay.statusCode, response: replay.response };
      }
    }

    await this.assertProfessionalAllowed(invite, payload.professional_id);

    const professional = await this.professionalModel.query().where('id', payload.professional_id).whereNull('deleted_at').first();

    if (!professional) {
      throw new ApiException(404, 'PROFESSIONAL_NOT_FOUND', 'Profissional não encontrado.', {});
    }

    const procedure = payload.procedure_id ? await this.findProcedure(payload.procedure_id) : null;
    const exam = payload.exam_id ? await this.findExam(payload.exam_id) : null;

    await this.assertProcedureAllowed(invite, professional, procedure, exam);

    const trx = await this.database.transaction();

    try {
      const slot = await this.scheduleSlotModel
        .query({ client: trx })
        .where('id', payload.schedule_slot_id)
        .where('professional_id', payload.professional_id)
        .forUpdate()
        .first();

      if (!slot) {
        throw new ApiException(400, 'SLOT_INVALID', 'Horário inválido.', {});
      }

      if (SCHEDULE_SLOT_BLOCKED_STATUSES.includes(String(slot.status).toUpperCase())) {
        throw await this.slotUnavailable(professional.id, slot, procedure, exam);
      }

      const conflict = await this.appointmentModel
        .query({ client: trx })
        .where('schedule_slot_id', slot.id)
        .whereNull('deleted_at')
        .whereNotIn('status', APPOINTMENT_INACTIVE_STATUSES)
        .first();

      if (conflict) {
        throw await this.slotUnavailable(professional.id, slot, procedure, exam);
      }

      const requiredMinutes = procedure?.duration_minutes ?? exam?.duration_minutes ?? null;
      const slotMinutes = toUtcDateTime(slot.end_time).diff(toUtcDateTime(slot.start_time), 'minutes').minutes;

      if (requiredMinutes !== null && slotMinutes < requiredMinutes) {
        throw new ApiException(400, 'SLOT_TOO_SHORT', 'O procedimento não cabe neste horário.', {
          slotMinutes,
          requiredMinutes,
        });
      }

      const appointment = await this.appointmentModel.create(
        {
          patient_id: invite.patient_id,
          professional_id: String(professional.id),
          exam_id: exam ? String(exam.id) : null,
          procedure_id: procedure ? String(procedure.id) : null,
          schedule_slot_id: String(slot.id),
          start_time: toUtcDateTime(slot.start_time).toISO(),
          end_time: toUtcDateTime(slot.end_time).toISO(),
          status: APPOINTMENT_STATUS_CONFIRMED,
          notes: payload.notes ?? null,
          is_blocked: false,
        },
        { client: trx },
      );

      invite.used_at = DateTime.now();
      invite.useTransaction(trx);
      await invite.save();

      await trx.commit();

      const response = this.toAppointmentResponse(invite, appointment);

      if (idempotencyKey) {
        const stored = await this.storeReplay(idempotencyKey, 201, response);
        if (stored) {
          return {
            isReplay: true,
            statusCode: stored.statusCode,
            response: stored.response,
          };
        }
      }

      return { isReplay: false, statusCode: 201, response };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Gera o conteúdo `.ics` de um agendamento para o paciente.
   */
  async buildIcsEvent(invite: SchedulingInvite, appointmentId: string): Promise<{ filename: string; content: string }> {
    const { appointment, professional, serviceName } = await this.findAppointmentForPatient(invite, appointmentId);

    const content = buildIcs({
      uid: `medkit-${appointment.id}`,
      start: appointment.start_time.toUTC(),
      end: appointment.end_time.toUTC(),
      summary: `Consulta com ${professional.name}`,
      description: serviceName ? `Procedimento: ${serviceName}` : undefined,
      location: process.env.FRONTEND_URL ?? '',
    });

    return { filename: `agendamento-${appointment.id}.ics`, content };
  }

  /**
   * Gera o PDF do convite de um agendamento.
   *
   * O HTML sai do template `templates/pdfs/scheduling-invite` (Edge.js) e é
   * impresso pelo Chrome headless — ver `app/utils/html-to-pdf.ts`. O QR Code
   * aponta para a tela pública do próprio agendamento, de onde o paciente
   * confere ou cancela; não é um canal de check-in da recepção.
   */
  async buildPdfInvite(invite: SchedulingInvite, appointmentId: string): Promise<{ filename: string; buffer: Buffer }> {
    const { appointment, professional, serviceName } = await this.findAppointmentForPatient(invite, appointmentId);

    const clinic = await this.userModel.find(invite.clinic_id);

    if (!clinic) {
      throw new ApiException(404, 'CLINIC_NOT_FOUND', 'Clínica não encontrada.', {});
    }

    const manageUrl = this.buildManageUrl(invite);
    const qrCode = await QRCode.toDataURL(manageUrl, {
      margin: 0,
      width: 512,
      errorCorrectionLevel: 'M',
      color: { dark: '#2a1a1a', light: '#ffffff' },
    });

    const start = appointment.start_time.setZone(DEFAULT_TIMEZONE);
    const end = appointment.end_time.setZone(DEFAULT_TIMEZONE);
    const durationMinutes = Math.round(end.diff(start, 'minutes').minutes);
    const isCancelled = APPOINTMENT_INACTIVE_STATUSES.includes(appointment.status);
    const timeLabel = `${start.toFormat('HH:mm')} às ${end.toFormat('HH:mm')}`;

    const html = await edge.render('templates/pdfs/scheduling-invite', {
      clinicName: clinic.name,
      clinicPhone: clinic.phone ?? null,
      logo: await this.clinicLogoDataUrl(),
      professionalName: professional.name,
      professionalSpecialty: professional.specialty ?? null,
      professionalRegistration: professional.registration_number ?? null,
      serviceName,
      serviceKindLabel: appointment.procedure_id ? 'Procedimento' : 'Exame',
      dayLabel: start.toFormat('dd'),
      monthLabel: start.toFormat('LLL'),
      dateLabel: start.setLocale('pt-BR').toFormat("cccc, dd 'de' LLLL 'de' yyyy"),
      timeLabel,
      // Textos compostos aqui para o template não precisar de condicionais inline,
      // que engoliam espaços e quebam a linha em PDF.
      timeHintLabel: durationMinutes > 0 ? `${timeLabel} · ${durationMinutes} minutos` : timeLabel,
      footerClinicLine: clinic.phone ? `${clinic.name} · ${clinic.phone}` : clinic.name,
      statusLabel: appointmentStatusLabel(appointment.status),
      statusChipClass: isCancelled ? 'chip chip--cancelled' : 'chip',
      // O template decide os textos de cabeçalho/rodapé a partir daqui.
      isCancelled,
      qrCode,
      manageUrl,
      cancelWindowLabel: `${CANCEL_WINDOW_HOURS} horas`,
      issuedAtLabel: DateTime.now().setZone(DEFAULT_TIMEZONE).setLocale('pt-BR').toFormat("dd/MM/yyyy 'às' HH:mm"),
    });

    const buffer = await renderPdf(html);

    return { filename: `convite-${appointment.id}.pdf`, buffer };
  }

  /**
   * URL pública do agendamento, usada no QR Code e no rodapé do PDF.
   *
   * `FRONTEND_URL` é obrigatório aqui: um QR com caminho relativo não
   * abre nada no celular do paciente, então falhar alto é melhor do que
   * entregar um documento com QR quebrado.
   */
  private buildManageUrl(invite: SchedulingInvite): string {
    const base = (process.env.FRONTEND_URL ?? '').trim().replace(/\/+$/, '');

    if (!base) {
      throw new ApiException(500, 'FRONTEND_URL_MISSING', 'FRONTEND_URL não configurado no servidor.', {});
    }

    return `${base}/to-schedule/${invite.token}`;
  }

  /**
   * Logo em data URL. O campo `users.logo` está vazio na base, então usamos
   * o asset do projeto (mesmo caminho do e-mail de confirmação). Se o arquivo
   * faltar, o template é renderizado sem logo.
   */
  private async clinicLogoDataUrl(): Promise<string | null> {
    const path = './assets/medkit-logo.png';

    try {
      const buffer = await fs.readFile(path);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      logger.warn({ err: error, path }, 'pdf.logo_not_found');
      return null;
    }
  }

  /**
   * Cancela um agendamento, respeitando a janela mínima de antecedência
   * (configurável via `CANCEL_WINDOW_HOURS`, default 24h).
   */
  async cancelAppointment(invite: SchedulingInvite, appointmentId: string): Promise<{ cancelled: boolean }> {
    const { appointment } = await this.findAppointmentForPatient(invite, appointmentId);

    const hoursLeft = appointment.start_time.diff(DateTime.now(), 'hours').hours;

    if (hoursLeft < CANCEL_WINDOW_HOURS) {
      throw new ApiException(409, 'OUT_OF_WINDOW', 'Fora da janela de cancelamento.', {
        hoursLeft: Math.round(hoursLeft * 10) / 10,
        minimumHours: CANCEL_WINDOW_HOURS,
      });
    }

    appointment.merge({
      status: APPOINTMENT_STATUS_CANCELLED,
      deleted_at: DateTime.now(),
    });
    await appointment.save();

    return { cancelled: true };
  }

  private async tiePatient(invite: SchedulingInvite, patientId: string): Promise<void> {
    if (invite.patient_id && invite.patient_id !== patientId) {
      throw new ApiException(409, 'PATIENT_CONFLICT', 'Este link já está vinculado a outro paciente.', {});
    }

    if (!invite.patient_id) {
      invite.patient_id = patientId as UUID;
      await invite.save();
    }
  }

  private async findProcedure(id: string) {
    const procedure = await this.procedureModel.query().where('id', id).whereNull('deleted_at').first();

    if (!procedure) {
      throw new ApiException(404, 'PROCEDURE_NOT_FOUND', 'Procedimento não encontrado.', {});
    }

    return procedure;
  }

  private async findExam(id: string) {
    const exam = await this.examModel.query().where('id', id).whereNull('deleted_at').first();

    if (!exam) {
      throw new ApiException(404, 'EXAM_NOT_FOUND', 'Exame não encontrado.', {});
    }

    return exam;
  }

  private async assertProfessionalAllowed(invite: SchedulingInvite, professionalId: string) {
    if (invite.professional_id && String(invite.professional_id) !== professionalId) {
      throw new ApiException(403, 'PROFESSIONAL_NOT_ALLOWED', 'Profissional não permitido para este link.', {});
    }
  }

  private async assertProcedureAllowed(invite: SchedulingInvite, professional: any, procedure: any, exam: any) {
    if (procedure) {
      if (invite.procedure_ids?.length && !invite.procedure_ids.includes(String(procedure.id))) {
        throw new ApiException(403, 'PROCEDURE_NOT_ALLOWED', 'Procedimento não permitido para este link.', {});
      }

      const attached = await professional.related('procedures').query().where('procedures.id', procedure.id).first();
      if (!attached) {
        throw new ApiException(400, 'PROCEDURE_UNATTACHED', 'Procedimento não disponível para o profissional.', {});
      }
    }

    if (exam) {
      if (invite.exam_ids?.length && !invite.exam_ids.includes(String(exam.id))) {
        throw new ApiException(403, 'EXAM_NOT_ALLOWED', 'Exame não permitido para este link.', {});
      }

      const attached = await professional.related('exams').query().where('exams.id', exam.id).first();
      if (!attached) {
        throw new ApiException(400, 'EXAM_UNATTACHED', 'Exame não disponível para o profissional.', {});
      }
    }
  }

  private async slotUnavailable(professionalId: string, slot: any, procedure: any, exam: any): Promise<ApiException> {
    const start = toUtcDateTime(slot.start_time);
    const day = start.setZone(DEFAULT_TIMEZONE);

    const availableSlots = await this.availabilityService.findAvailability({
      professionalId,
      procedureDurationMinutes: procedure?.duration_minutes ?? exam?.duration_minutes ?? null,
      from: day.startOf('day').toJSDate(),
      to: day.endOf('day').toJSDate(),
      timezone: DEFAULT_TIMEZONE,
    });

    return new ApiException(409, 'SLOT_TAKEN', 'Este horário acabou de ser reservado.', {
      available_slots: availableSlots,
    });
  }

  private async findAppointmentForPatient(invite: SchedulingInvite, appointmentId: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appointmentId)) {
      throw new ApiException(404, 'APPOINTMENT_NOT_FOUND', 'Agendamento não encontrado.', {});
    }

    const appointment = await this.appointmentModel
      .query()
      .where('id', appointmentId)
      .where('patient_id', invite.patient_id)
      .whereNull('deleted_at')
      .first();

    if (!appointment) {
      throw new ApiException(404, 'APPOINTMENT_NOT_FOUND', 'Agendamento não encontrado.', {});
    }

    const professional = await this.professionalModel.query().where('id', appointment.professional_id).first();

    if (!professional) {
      throw new ApiException(404, 'PROFESSIONAL_NOT_FOUND', 'Profissional não encontrado.', {});
    }

    let serviceName: string | null = null;
    if (appointment.procedure_id) {
      const procedure = await this.procedureModel.find(appointment.procedure_id);
      serviceName = procedure?.name ?? null;
    } else if (appointment.exam_id) {
      const exam = await this.examModel.find(appointment.exam_id);
      serviceName = exam?.name ?? null;
    }

    return { appointment, professional, serviceName };
  }

  private toAppointmentResponse(invite: SchedulingInvite, appointment: any): Record<string, unknown> {
    return {
      appointment: {
        id: String(appointment.id),
        patient_id: appointment.patient_id,
        professional_id: appointment.professional_id,
        exam_id: appointment.exam_id ?? null,
        procedure_id: appointment.procedure_id ?? null,
        schedule_slot_id: appointment.schedule_slot_id ?? null,
        start_time: this.toIso(appointment.start_time),
        end_time: this.toIso(appointment.end_time),
        status: appointment.status,
        notes: appointment.notes ?? null,
      },
      ics_url: `${PUBLIC_SCHEDULING_PREFIX}/${invite.token}/appointments/${appointment.id}/ics`,
      cancel_url: `${PUBLIC_SCHEDULING_PREFIX}/${invite.token}/appointments/${appointment.id}/cancel`,
    };
  }

  private toIso(value: any): string | null {
    if (!value) return null;
    if (typeof value.toISO === 'function') return value.toISO() ?? null;
    if (typeof value.toISOString === 'function') return value.toISOString();
    return String(value);
  }

  private toProfessionalDto(professional: any): ProfessionalDto {
    return {
      id: String(professional.id),
      name: professional.name,
      specialty: professional.specialty ?? undefined,
      registration_number: professional.registration_number ?? undefined,
    };
  }

  private async getReplay(key: string) {
    const record = await this.idempotencyKeyModel
      .query()
      .where('key', key)
      .where('created_at', '>=', DateTime.now().minus({ hours: IDEMPOTENCY_WINDOW_HOURS }))
      .first();

    if (!record) return null;

    return { statusCode: record.status_code, response: record.response };
  }

  private async storeReplay(
    key: string,
    statusCode: number,
    response: Record<string, unknown>,
  ): Promise<{ statusCode: number; response: Record<string, unknown> } | null> {
    try {
      await this.idempotencyKeyModel.create({
        key,
        scope: IDEMPOTENCY_SCOPE_APPOINTMENT,
        status_code: statusCode,
        response,
      });
      return null;
    } catch (error: any) {
      if (error?.code === '23505') {
        return this.getReplay(key);
      }
      throw error;
    }
  }
}
