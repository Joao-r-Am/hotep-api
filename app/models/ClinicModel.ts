import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'node:crypto'
import { IClinic } from '../interfaces/clinic.interface.js'
import ClinicMembership from './ClinicMembershipModel.js'

export default class Clinic extends BaseModel implements IClinic {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare name: string

  @column()
  declare cnpjf: string | null

  @column()
  declare phone: string | null

  @column()
  declare site_page: string | null

  @column()
  declare logo: string | null

  @column()
  declare max_users: number | null

  @column.dateTime()
  declare sub_expires_at: DateTime | null

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | null

  @hasMany(() => ClinicMembership)
  declare memberships: HasMany<typeof ClinicMembership>
}
