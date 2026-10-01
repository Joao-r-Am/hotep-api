import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import type { UUID } from 'node:crypto'
import { IIdempotencyKey } from '../interfaces/idempotency-key.interface.js'

export default class IdempotencyKey extends BaseModel implements IIdempotencyKey {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare key: string

  @column()
  declare scope: string

  @column()
  declare status_code: number

  @column()
  declare response: Record<string, unknown>

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime
}
