import BaseCrudService, { CrudResourceConfig } from './base-crud-service.js'
import Procedure from '#models/ProcedureModel'
import { createProcedureValidator, updateProcedureValidator } from '#validators/clinical'

export type ProceduresServiceDeps = Partial<
  Pick<CrudResourceConfig, 'model' | 'createValidator' | 'updateValidator' | 'uniqueFields'>
>

export default class ProceduresService extends BaseCrudService {
  constructor(deps: ProceduresServiceDeps = {}) {
    super({
      model: deps.model ?? Procedure,
      notFoundMessage: 'Procedure not found',
      softDeleteColumn: 'deleted_at',
      createValidator: deps.createValidator ?? createProcedureValidator,
      updateValidator: deps.updateValidator ?? updateProcedureValidator,
      uniqueFields: deps.uniqueFields ?? [],
    })
  }
}
