import Appointment from '#models/AppointmentModel'
import Exam from '#models/ExamModel'
import Patient from '#models/PatientModel'
import Procedure from '#models/ProcedureModel'
import Professional from '#models/ProfessionalModel'
import ScheduleSlot from '#models/ScheduleSlotModel'
import BaseCrudService from './base-crud-service.js'
import { createAppointmentValidator, updateAppointmentValidator } from '#validators/clinical'

export default class AppointmentsService extends BaseCrudService {
  constructor() {
    super({
      model: Appointment,
      notFoundMessage: 'Appointment not found',
      softDeleteColumn: 'deleted_at',
      createValidator: createAppointmentValidator,
      updateValidator: updateAppointmentValidator,
      defaultReadPreloads: ['patient', 'professional', 'exam', 'procedure', 'scheduleSlot'],
    })
  }

  override async create(payload: Record<string, unknown>) {
    const validated = await createAppointmentValidator.validate(payload)
    await this.validateRelations(validated)

    const record = await Appointment.create(validated as any)
    return this.read(String(record.id))
  }

  override async update(id: string, payload: Record<string, unknown>) {
    const record: any = await this.findByIdOrFail(id)
    const validated = await updateAppointmentValidator.validate(payload)
    const mergedPayload = {
      patient_id: validated.patient_id ?? record.patient_id,
      professional_id: validated.professional_id ?? record.professional_id,
      exam_id: validated.exam_id ?? record.exam_id ?? undefined,
      procedure_id: validated.procedure_id ?? record.procedure_id ?? undefined,
      schedule_slot_id: validated.schedule_slot_id ?? record.schedule_slot_id ?? undefined,
    }

    await this.validateRelations(mergedPayload)

    record.merge(validated)
    await record.save()
    return this.read(id)
  }

  private async validateRelations(payload: Record<string, unknown>) {
    await this.ensurePatientExists(String(payload.patient_id))
    await this.ensureProfessionalExists(String(payload.professional_id))

    if (payload.exam_id) {
      await this.ensureExamExists(String(payload.exam_id))
    }

    if (payload.procedure_id) {
      await this.ensureProcedureExists(String(payload.procedure_id))
    }

    if (payload.schedule_slot_id) {
      await this.ensureScheduleSlotExists(String(payload.schedule_slot_id), String(payload.professional_id))
    }
  }

  private async ensurePatientExists(id: string) {
    const patient = await Patient.query().where('id', id).whereNull('deleted_at').first()

    if (!patient) {
      throw { message: 'Patient not found', status: 404 }
    }
  }

  private async ensureProfessionalExists(id: string) {
    const professional = await Professional.query().where('id', id).whereNull('deleted_at').first()

    if (!professional) {
      throw { message: 'Professional not found', status: 404 }
    }
  }

  private async ensureExamExists(id: string) {
    const exam = await Exam.query().where('id', id).whereNull('deleted_at').first()

    if (!exam) {
      throw { message: 'Exam not found', status: 404 }
    }
  }

  private async ensureProcedureExists(id: string) {
    const procedure = await Procedure.query().where('id', id).whereNull('deleted_at').first()

    if (!procedure) {
      throw { message: 'Procedure not found', status: 404 }
    }
  }

  private async ensureScheduleSlotExists(id: string, professionalId: string) {
    const scheduleSlot = await ScheduleSlot.query()
      .where('id', id)
      .where('professional_id', professionalId)
      .first()

    if (!scheduleSlot) {
      throw { message: 'Schedule slot not found for professional', status: 404 }
    }
  }
}
