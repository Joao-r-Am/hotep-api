import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'node:crypto'
import { IRole } from '../interfaces/clinic.interface.js'
import Clinic from './ClinicModel.js'
import ClinicMembership from './ClinicMembershipModel.js'
import Permission from './PermissionModel.js'

export default class Role extends BaseModel implements IRole {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare clinic_id: UUID | null

  @column()
  declare name: string

  @column()
  declare is_system: boolean

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

  @manyToMany(() => Permission, { pivotTable: 'role_permissions' })
  declare permissions: ManyToMany<typeof Permission>

  @manyToMany(() => ClinicMembership, {
    pivotTable: 'membership_roles',
    pivotForeignKey: 'membership_id',
  })
  declare memberships: ManyToMany<typeof ClinicMembership>
}
