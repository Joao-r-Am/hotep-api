import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import type { UUID } from 'crypto'
import { IProfessional } from '../interfaces/professional.interface.js'
import Appointment from './AppointmentModel.js'
import Exam from './ExamModel.js'
import Procedure from './ProcedureModel.js'
import ScheduleSlot from './ScheduleSlotModel.js'

export default class Professional extends BaseModel implements IProfessional {
  @column({ isPrimary: true })
  declare id: UUID

  @column()
  declare name: string

  @column()
  declare document: string

  @column()
  declare birth_date: DateTime | undefined

  @column()
  declare specialty: string | undefined

  @column()
  declare registration_number: string | undefined

  @column()
  declare phone: string | undefined

  @column()
  declare email: string | undefined

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | undefined

  @column.dateTime()
  declare deleted_at: DateTime | undefined

  @hasMany(() => Appointment)
  declare appointments: HasMany<typeof Appointment>

  @hasMany(() => ScheduleSlot)
  declare scheduleSlots: HasMany<typeof ScheduleSlot>

  @manyToMany(() => Exam, {
    pivotTable: 'professional_exam',
  })
  declare exams: ManyToMany<typeof Exam>

  @manyToMany(() => Procedure, {
    pivotTable: 'professional_procedure',
  })
  declare procedures: ManyToMany<typeof Procedure>
}
