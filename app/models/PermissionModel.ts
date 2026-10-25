import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'node:crypto'
import { IPermission } from '../interfaces/clinic.interface.js'
import Role from './RoleModel.js'

export default class Permission extends BaseModel implements IPermission {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare code: string

  @column()
  declare description: string

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | null

  @manyToMany(() => Role, { pivotTable: 'role_permissions' })
  declare roles: ManyToMany<typeof Role>
}
