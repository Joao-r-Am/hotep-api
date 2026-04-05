import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import type { UUID } from 'crypto'
import { AccessType, EspecialtyArea, IUser } from '../interfaces/users.inteface.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email', 'cnpjf'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) implements IUser{
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare name: string

  @column({  })
  declare cnpjf: string

  @column({serializeAs: null})
  declare password: string

  @column()
  declare email: string

  @column()
  declare phone: string

  @column()
  declare site_page: string

  @column.dateTime({ autoCreate: false })
  declare birthday: DateTime

  @column()
  declare access_type: AccessType

  @column()
  declare especialty_area: EspecialtyArea

  @column()
  declare roles: Array<string>

  @column()
  declare logo: string

  @column()
  declare max_users: number

  @column.dateTime({ autoCreate: false })
  declare sub_expires_at: DateTime

  @column()
  declare active: boolean

  @column.dateTime()
  declare deleted_at: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
