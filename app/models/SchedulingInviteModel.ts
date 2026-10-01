import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'node:crypto'
import { ISchedulingInvite } from '../interfaces/scheduling-invite.interface.js'
import User from './UsersModel.js'
import Patient from './PatientModel.js'
import Professional from './ProfessionalModel.js'

export default class SchedulingInvite extends BaseModel implements ISchedulingInvite {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare token: string

  @column()
  declare clinic_id: UUID

  @column()
  declare patient_id: UUID | null

  @column()
  declare professional_id: UUID | null

  @column()
  declare procedure_ids: string[] | null

  @column()
  declare exam_ids: string[] | null

  @column.dateTime()
  declare expires_at: DateTime

  @column.dateTime()
  declare used_at: DateTime | null

  @column()
  declare created_by: UUID

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | null

  @belongsTo(() => User, {
    foreignKey: 'clinic_id',
  })
  declare clinic: BelongsTo<typeof User>

  @belongsTo(() => User, {
    foreignKey: 'created_by',
  })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => Patient, {
    foreignKey: 'patient_id',
  })
  declare patient: BelongsTo<typeof Patient>

  @belongsTo(() => Professional, {
    foreignKey: 'professional_id',
  })
  declare professional: BelongsTo<typeof Professional>
}
