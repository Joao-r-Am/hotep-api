import { DateTime } from 'luxon';
import SchedulingInvite from '#models/SchedulingInviteModel';
import Patient from '#models/PatientModel';
import Professional from '#models/ProfessionalModel';
import Procedure from '#models/ProcedureModel';
import Exam from '#models/ExamModel';
import { generateSchedulingToken } from '../utils/generate-token.js';
import { ApiException } from '../utils/api-error.js';
import type { SchedulingInvitesServiceDeps, CreateInvitePayload, InviteListItem } from '../interfaces/scheduling-invites-service.types.js';

const DEFAULT_EXPIRES_IN_DAYS = 7;

/**
 * Gerencia convites de auto-agendamento (uso interno/operador).
 *
 * O convite sempre pertence à clínica (usuário autenticado) que o criou.
 * A URL pública é montada a partir de `FRONTEND_URL` (env).
 */
export default class SchedulingInvitesService {
  private readonly inviteModel: any;
  private readonly patientModel: any;
  private readonly professionalModel: any;
  private readonly procedureModel: any;
  private readonly examModel: any;

  constructor(deps: SchedulingInvitesServiceDeps = {}) {
    this.inviteModel = deps.inviteModel ?? SchedulingInvite;
    this.patientModel = deps.patientModel ?? Patient;
    this.professionalModel = deps.professionalModel ?? Professional;
    this.procedureModel = deps.procedureModel ?? Procedure;
    this.examModel = deps.examModel ?? Exam;
  }

  /**
   * Cria um convite validando as referências informadas e devolve
   * `{ id, token, url, expires_at }`.
   */
  async create(clinicId: string, createdBy: string, payload: CreateInvitePayload) {
    const expiresInDays = payload.expires_in_days ?? DEFAULT_EXPIRES_IN_DAYS;

    await this.assertReferencesExist(payload);

    const token = generateSchedulingToken();
    const invite = await this.inviteModel.create({
      token,
      clinic_id: clinicId,
      patient_id: payload.patient_id ?? null,
      professional_id: payload.professional_id ?? null,
      procedure_ids: payload.procedure_ids ?? null,
      exam_ids: payload.exam_ids ?? null,
      expires_at: DateTime.now().plus({ days: expiresInDays }),
      created_by: createdBy,
    });

    return {
      id: String(invite.id),
      token: invite.token,
      url: this.buildUrl(invite.token),
      expires_at: invite.expires_at.toISO(),
    };
  }

  /**
   * Lista os convites da clínica com o status calculado
   * (`pending | used | expired | revoked`).
   */
  async list(clinicId: string): Promise<{ data: InviteListItem[] }> {
    const invites = await this.inviteModel.query().where('clinic_id', clinicId).orderBy('created_at', 'desc');

    const now = DateTime.now();
    const data: InviteListItem[] = invites.map((invite: any) => {
      const status = this.computeStatus(invite, now);

      return {
        id: String(invite.id),
        token: invite.token,
        url: this.buildUrl(invite.token),
        patient_id: invite.patient_id ?? null,
        professional_id: invite.professional_id ?? null,
        procedure_ids: invite.procedure_ids ?? null,
        exam_ids: invite.exam_ids ?? null,
        expires_at: invite.expires_at.toISO(),
        used_at: invite.used_at?.toISO() ?? null,
        created_by: invite.created_by,
        status,
      };
    });

    return { data };
  }

  /**
   * Revoga um convite (soft delete + expiração imediata).
   */
  async revoke(id: string, clinicId: string): Promise<{ revoked: boolean }> {
    const invite = await this.inviteModel.query().where('id', id).where('clinic_id', clinicId).whereNull('deleted_at').first();

    if (!invite) {
      throw new ApiException(404, 'INVITE_NOT_FOUND', 'Convite não encontrado.', {});
    }

    invite.merge({ expires_at: DateTime.now(), deleted_at: DateTime.now() });
    await invite.save();

    return { revoked: true };
  }

  private computeStatus(invite: any, now: DateTime): InviteListItem['status'] {
    if (invite.deleted_at) return 'revoked';
    if (invite.used_at) return 'used';
    if (invite.expires_at.toMillis() < now.toMillis()) return 'expired';
    return 'pending';
  }

  private buildUrl(token: string): string {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:9000';
    return `${frontendUrl}/#/to-schedule/${token}`;
  }

  private async assertReferencesExist(payload: CreateInvitePayload) {
    if (payload.patient_id) {
      await this.assertExists(this.patientModel, payload.patient_id, 'Patient not found', 404);
    }
    if (payload.professional_id) {
      await this.assertExists(this.professionalModel, payload.professional_id, 'Professional not found', 404);
    }

    for (const id of payload.procedure_ids ?? []) {
      await this.assertExists(this.procedureModel, id, `Procedure not found: ${id}`, 404);
    }
    for (const id of payload.exam_ids ?? []) {
      await this.assertExists(this.examModel, id, `Exam not found: ${id}`, 404);
    }
  }

  private async assertExists(model: any, id: string, message: string, status: number) {
    const record = await model.query().where('id', id).whereNull('deleted_at').first();
    if (!record) {
      throw new ApiException(status, 'INVITE_REFERENCE_INVALID', message, { id });
    }
  }
}
