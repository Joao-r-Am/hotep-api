import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { UUID } from 'crypto'
import { IProfessionalExam } from '../interfaces/professional-exam.interface.js'
import Professional from './ProfessionalModel.js'
import Exam from './ExamModel.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ProfessionalExam extends BaseModel implements IProfessionalExam {
  @column({ isPrimary: true })
  declare professional_id: UUID

  @column({ isPrimary: true })
  declare exam_id: UUID

  @belongsTo(() => Professional)
  declare professional: BelongsTo<typeof Professional>

  @belongsTo(() => Exam)
  declare exam: BelongsTo<typeof Exam>
}
