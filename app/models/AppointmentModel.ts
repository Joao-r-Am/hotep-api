import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'crypto'
import { IAppointment } from '../interfaces/appointment.interface.js'
import Patient from './PatientModel.js'
import Professional from './ProfessionalModel.js'
import Exam from './ExamModel.js'
import Procedure from './ProcedureModel.js'
import ScheduleSlot from './ScheduleSlotModel.js'

export default class Appointment extends BaseModel implements IAppointment {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare patient_id: UUID

  @column()
  declare professional_id: UUID

  @column()
  declare exam_id: UUID | null

  @column()
  declare procedure_id: UUID | null

  @column()
  declare schedule_slot_id: UUID | null

  @column.dateTime()
  declare start_time: DateTime

  @column.dateTime()
  declare end_time: DateTime

  @column()
  declare status: string

  @column()
  declare notes: string | null

  @column()
  declare is_blocked: boolean

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime()
  declare closed_at: DateTime | null

  @belongsTo(() => Patient, {
    foreignKey: 'patient_id',
  })
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => Professional, {
    foreignKey: 'professional_id',
  })
  declare professional: BelongsTo<typeof Professional>

  @belongsTo(() => Exam, {
    foreignKey: 'exam_id',
  })
  declare exam: BelongsTo<typeof Exam>

  @belongsTo(() => Procedure, {
    foreignKey: 'procedure_id',
  })
  declare procedure: BelongsTo<typeof Procedure>

  @belongsTo(() => ScheduleSlot, {
    foreignKey: 'schedule_slot_id',
  })
  declare scheduleSlot: BelongsTo<typeof ScheduleSlot>
}
