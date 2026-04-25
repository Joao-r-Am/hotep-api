import Exam from '#models/ExamModel'
import BaseCrudService from './base-crud-service.js'
import { createExamValidator, updateExamValidator } from '#validators/clinical'

export default class ExamsService extends BaseCrudService {
  constructor() {
    super({
      model: Exam,
      notFoundMessage: 'Exam not found',
      softDeleteColumn: 'deleted_at',
      createValidator: createExamValidator,
      updateValidator: updateExamValidator,
      uniqueFields: [{ field: 'code', message: 'Exam code already exists' }],
    })
  }
}
