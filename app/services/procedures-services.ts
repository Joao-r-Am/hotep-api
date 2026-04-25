import Procedure from '#models/ProcedureModel'
import BaseCrudService from './base-crud-service.js'
import { createProcedureValidator, updateProcedureValidator } from '#validators/clinical'

export default class ProceduresService extends BaseCrudService {
  constructor() {
    super({
      model: Procedure,
      notFoundMessage: 'Procedure not found',
      softDeleteColumn: 'deleted_at',
      createValidator: createProcedureValidator,
      updateValidator: updateProcedureValidator,
    })
  }
}
