import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'crypto'
import { IScheduleSlot } from '../interfaces/schedule-slot.interface.js'
import Professional from './ProfessionalModel.js'

export default class ScheduleSlot extends BaseModel implements IScheduleSlot {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare professional_id: UUID

  @column.dateTime()
  declare start_time: DateTime

  @column.dateTime()
  declare end_time: DateTime

  @column()
  declare status: string

  @column()
  declare notes: string | undefined

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | undefined

  @belongsTo(() => Professional)
  declare professional: BelongsTo<typeof Professional>
}
