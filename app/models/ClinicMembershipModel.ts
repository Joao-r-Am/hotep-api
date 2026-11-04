import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'node:crypto'
import { IClinicMembership, MembershipStatus } from '../interfaces/clinic.interface.js'
import Clinic from './ClinicModel.js'
import User from './UsersModel.js'
import Role from './RoleModel.js'

export default class ClinicMembership extends BaseModel implements IClinicMembership {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare clinic_id: UUID

  @column()
  declare user_id: UUID

  @column()
  declare status: MembershipStatus

  @column.dateTime()
  declare deleted_at: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | null

  @belongsTo(() => Clinic, {
    foreignKey: 'clinic_id',
  })
  declare clinic: BelongsTo<typeof Clinic>

  @belongsTo(() => User, {
    foreignKey: 'user_id',
  })
  declare user: BelongsTo<typeof User>

  @manyToMany(() => Role, {
    pivotTable: 'membership_roles',
    pivotForeignKey: 'membership_id',
  })
  declare roles: ManyToMany<typeof Role>
}
