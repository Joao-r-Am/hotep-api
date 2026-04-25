import Professional from '#models/ProfessionalModel'
import Exam from '#models/ExamModel'
import Procedure from '#models/ProcedureModel'
import BaseCrudService from './base-crud-service.js'
import {
  attachProfessionalExamValidator,
  attachProfessionalProcedureValidator,
  createProfessionalValidator,
  updateProfessionalValidator,
} from '#validators/clinical'

export default class ProfessionalsService extends BaseCrudService {
  constructor() {
    super({
      model: Professional,
      notFoundMessage: 'Professional not found',
      softDeleteColumn: 'deleted_at',
      createValidator: createProfessionalValidator,
      updateValidator: updateProfessionalValidator,
      uniqueFields: [{ field: 'document', message: 'Professional document already exists' }],
      defaultReadPreloads: ['exams', 'procedures'],
    })
  }

  async listExams(id: string) {
    const professional: any = await this.findByIdOrFail(id)
    const exams = await professional
      .related('exams')
      .query()
      .whereNull('exams.deleted_at')
      .orderBy('exams.name', 'asc')

    return exams.map((exam: any) => exam.serialize())
  }

  async attachExam(id: string, payload: Record<string, unknown>) {
    const professional: any = await this.findByIdOrFail(id)
    const { exam_id } = await attachProfessionalExamValidator.validate(payload)

    await this.ensureExamExists(exam_id)

    const existingExam = await professional
      .related('exams')
      .query()
      .where('exams.id', exam_id)
      .whereNull('exams.deleted_at')
      .first()

    if (existingExam) {
      throw { message: 'Exam already linked to professional', status: 409 }
    }

    await professional.related('exams').attach([exam_id])

    return this.listExams(id)
  }

  async detachExam(id: string, examId: string) {
    const professional: any = await this.findByIdOrFail(id)
    const existingExam = await professional.related('exams').query().where('exams.id', examId).first()

    if (!existingExam) {
      throw { message: 'Exam link not found', status: 404 }
    }

    await professional.related('exams').detach([examId])
    return true
  }

  async listProcedures(id: string) {
    const professional: any = await this.findByIdOrFail(id)
    const procedures = await professional
      .related('procedures')
      .query()
      .whereNull('procedures.deleted_at')
      .orderBy('procedures.name', 'asc')

    return procedures.map((procedure: any) => procedure.serialize())
  }

  async attachProcedure(id: string, payload: Record<string, unknown>) {
    const professional: any = await this.findByIdOrFail(id)
    const { procedure_id } = await attachProfessionalProcedureValidator.validate(payload)

    await this.ensureProcedureExists(procedure_id)

    const existingProcedure = await professional
      .related('procedures')
      .query()
      .where('procedures.id', procedure_id)
      .whereNull('procedures.deleted_at')
      .first()

    if (existingProcedure) {
      throw { message: 'Procedure already linked to professional', status: 409 }
    }

    await professional.related('procedures').attach([procedure_id])

    return this.listProcedures(id)
  }

  async detachProcedure(id: string, procedureId: string) {
    const professional: any = await this.findByIdOrFail(id)
    const existingProcedure = await professional
      .related('procedures')
      .query()
      .where('procedures.id', procedureId)
      .first()

    if (!existingProcedure) {
      throw { message: 'Procedure link not found', status: 404 }
    }

    await professional.related('procedures').detach([procedureId])
    return true
  }

  private async ensureExamExists(id: string) {
    const exam = await Exam.query().where('id', id).whereNull('deleted_at').first()

    if (!exam) {
      throw { message: 'Exam not found', status: 404 }
    }
  }

  private async ensureProcedureExists(id: string) {
    const procedure = await Procedure.query().where('id', id).whereNull('deleted_at').first()

    if (!procedure) {
      throw { message: 'Procedure not found', status: 404 }
    }
  }
}
