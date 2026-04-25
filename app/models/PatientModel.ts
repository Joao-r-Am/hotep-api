import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'crypto'
import { IPatient } from '../interfaces/patient.interface.js'
import Appointment from './AppointmentModel.js'

export default class Patient extends BaseModel implements Exclude<IPatient, 'id'> {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare name: string

  @column()
  declare document: string

  @column()
  declare birth_date: DateTime | undefined

  @column()
  declare phone: string | undefined

  @column()
  declare email: string | undefined

  @column()
  declare observations: string | undefined

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | undefined

  @column.dateTime()
  declare deleted_at: DateTime | undefined

  @hasMany(() => Appointment)
  declare appointments: HasMany<typeof Appointment>
}
