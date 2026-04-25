import Professional from '#models/ProfessionalModel'
import ScheduleSlot from '#models/ScheduleSlotModel'
import BaseCrudService from './base-crud-service.js'
import { createScheduleSlotValidator, updateScheduleSlotValidator } from '#validators/clinical'

export default class ScheduleSlotsService extends BaseCrudService {
  constructor() {
    super({
      model: ScheduleSlot,
      notFoundMessage: 'Schedule slot not found',
      createValidator: createScheduleSlotValidator,
      updateValidator: updateScheduleSlotValidator,
      defaultReadPreloads: ['professional'],
    })
  }

  override async create(payload: Record<string, unknown>) {
    const validated = await createScheduleSlotValidator.validate(payload)
    await this.ensureProfessionalExists(String(validated.professional_id))
    await this.ensureTimeSlotIsAvailable(String(validated.professional_id), String(validated.start_time))

    const record = await ScheduleSlot.create(validated as any)
    return record.serialize()
  }

  override async update(id: string, payload: Record<string, unknown>) {
    const record: any = await this.findByIdOrFail(id)
    const validated = await updateScheduleSlotValidator.validate(payload)

    const professionalId = String(validated.professional_id ?? record.professional_id)
    const startTime = String(validated.start_time ?? record.start_time)

    await this.ensureProfessionalExists(professionalId)
    await this.ensureTimeSlotIsAvailable(professionalId, startTime, id)

    record.merge(validated)
    await record.save()

    return record.serialize()
  }

  private async ensureProfessionalExists(id: string) {
    const professional = await Professional.query().where('id', id).whereNull('deleted_at').first()

    if (!professional) {
      throw { message: 'Professional not found', status: 404 }
    }
  }

  private async ensureTimeSlotIsAvailable(professionalId: string, startTime: string, currentId?: string) {
    const query = ScheduleSlot.query().where('professional_id', professionalId).where('start_time', startTime)

    if (currentId) {
      query.whereNot('id', currentId)
    }

    const existingSlot = await query.first()

    if (existingSlot) {
      throw { message: 'Schedule slot already exists for this professional and start time', status: 409 }
    }
  }
}
