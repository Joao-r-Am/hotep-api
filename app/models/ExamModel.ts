import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'node:crypto'
import { IExam } from '../interfaces/exam.interface.js'
import Appointment from './AppointmentModel.js'
import Professional from './ProfessionalModel.js'

export default class Exam extends BaseModel implements IExam {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare code: string | undefined

  @column()
  declare name: string

  @column()
  declare type: string | undefined

  @column()
  declare specialty: string | undefined

  @column()
  declare description: string | undefined

  @column()
  declare preparation_instructions: string | undefined

  @column()
  declare duration_minutes: number | undefined

  @column()
  declare tags: string[] | undefined

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | undefined

  @column.dateTime()
  declare deleted_at: DateTime | undefined

  @hasMany(() => Appointment, {
    foreignKey: 'exam_id',
  })
  declare appointments: HasMany<typeof Appointment>

  @manyToMany(() => Professional, {
    pivotTable: 'professional_exam',
  })
  declare professionals: ManyToMany<typeof Professional>
}
