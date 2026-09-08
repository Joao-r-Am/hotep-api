import Professional from '#models/ProfessionalModel'
import ScheduleSlot from '#models/ScheduleSlotModel'
import BaseCrudService, { CrudResourceConfig } from './base-crud-service.js'
import { createScheduleSlotValidator, updateScheduleSlotValidator } from '#validators/clinical'

export type ScheduleSlotsServiceDeps = Partial<
  Pick<CrudResourceConfig, 'model' | 'createValidator' | 'updateValidator'> & {
    professionalModel: any
  }
>

export default class ScheduleSlotsService extends BaseCrudService {
  private readonly professionalModel: any

  constructor(deps: ScheduleSlotsServiceDeps = {}) {
    super({
      model: deps.model ?? ScheduleSlot,
      notFoundMessage: 'Schedule slot not found',
      createValidator: deps.createValidator ?? createScheduleSlotValidator,
      updateValidator: deps.updateValidator ?? updateScheduleSlotValidator,
      defaultReadPreloads: ['professional'],
    })

    this.professionalModel = deps.professionalModel ?? Professional
  }

  override async create(payload: Record<string, unknown>) {
    const validated = await this.config.createValidator!.validate(payload)
    await this.ensureProfessionalExists(String(validated.professional_id))
    await this.ensureTimeSlotIsAvailable(
      String(validated.professional_id),
      String(validated.start_time)
    )

    const record = await this.config.model.create(validated as any)
    return record.serialize()
  }

  override async update(id: string, payload: Record<string, unknown>) {
    const record: any = await this.findByIdOrFail(id)
    const validated = await this.config.updateValidator!.validate(payload)

    const professionalId = String(validated.professional_id ?? record.professional_id)
    const startTime = String(validated.start_time ?? record.start_time)

    await this.ensureProfessionalExists(professionalId)
    await this.ensureTimeSlotIsAvailable(professionalId, startTime, id)

    record.merge(validated)
    await record.save()

    return record.serialize()
  }

  private async ensureProfessionalExists(id: string) {
    const professional = await this.professionalModel
      .query()
      .where('id', id)
      .whereNull('deleted_at')
      .first()

    if (!professional) {
      throw { message: 'Professional not found', status: 404 }
    }
  }

  private async ensureTimeSlotIsAvailable(
    professionalId: string,
    startTime: string,
    currentId?: string
  ) {
    const query = this.config.model
      .query()
      .where('professional_id', professionalId)
      .where('start_time', startTime)

    if (currentId) {
      query.whereNot('id', currentId)
    }

    const existingSlot = await query.first()

    if (existingSlot) {
      throw {
        message: 'Schedule slot already exists for this professional and start time',
        status: 409,
      }
    }
  }
}
