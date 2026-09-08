import BaseCrudService, { CrudResourceConfig } from './base-crud-service.js'
import Exam from '#models/ExamModel'
import { createExamValidator, updateExamValidator } from '#validators/clinical'

export type ExamsServiceDeps = Partial<
  Pick<CrudResourceConfig, 'model' | 'createValidator' | 'updateValidator' | 'uniqueFields'>
>

export default class ExamsService extends BaseCrudService {
  constructor(deps: ExamsServiceDeps = {}) {
    super({
      model: deps.model ?? Exam,
      notFoundMessage: 'Exam not found',
      softDeleteColumn: 'deleted_at',
      createValidator: deps.createValidator ?? createExamValidator,
      updateValidator: deps.updateValidator ?? updateExamValidator,
      uniqueFields: deps.uniqueFields ?? [{ field: 'code', message: 'Exam code already exists' }],
    })
  }
}
