import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { ICode } from '../interfaces/code.interface.js'
import type { UUID } from 'crypto'

export default class Code extends BaseModel implements ICode {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare code: string

  @column()
  declare user_id: string

  @column.dateTime({ autoCreate: true })
  declare expires_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  save(): Promise<this> {
    this.expires_at = DateTime.now().plus({ hours: 1 })
    return super.save()
  }
}
