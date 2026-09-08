import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { UUID } from 'crypto'
import { IProfessionalProcedure } from '../interfaces/professional-procedure.interface.js'
import Professional from './ProfessionalModel.js'
import Procedure from './ProcedureModel.js'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class ProfessionalProcedure extends BaseModel implements IProfessionalProcedure {
  public static table = 'professional_procedure'

  @column({ isPrimary: true })
  declare professional_id: UUID

  @column({ isPrimary: true })
  declare procedure_id: UUID

  @belongsTo(() => Professional, {
    foreignKey: 'professional_id',
  })
  declare professional: BelongsTo<typeof Professional>

  @belongsTo(() => Procedure, {
    foreignKey: 'procedure_id',
  })
  declare procedure: BelongsTo<typeof Procedure>
}
