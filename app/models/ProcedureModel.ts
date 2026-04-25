import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'crypto'
import { IProcedure } from '../interfaces/procedure.interface.js'
import Appointment from './AppointmentModel.js'
import Professional from './ProfessionalModel.js'

export default class Procedure extends BaseModel implements IProcedure {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare name: string

  @column()
  declare description: string | undefined

  @column()
  declare duration_minutes: number | undefined

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | undefined

  @column.dateTime()
  declare deleted_at: DateTime | undefined

  @hasMany(() => Appointment)
  declare appointments: HasMany<typeof Appointment>

  @manyToMany(() => Professional, {
    pivotTable: 'professional_procedure',
  })
  declare professionals: ManyToMany<typeof Professional>
}
