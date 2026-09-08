import { test } from '@japa/runner'
import ProfessionalsService from './professionals-services.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'
import {
  professionalPayload,
  serializedExam,
  serializedProcedure,
} from '../../tests/unit/fixtures/professionals.js'
import { examId } from '../../tests/unit/fixtures/exams.js'
import { procedureId } from '../../tests/unit/fixtures/procedures.js'

type RelationMocks = {
  query: ReturnType<typeof createSpy>
  attach: ReturnType<typeof createSpy>
  detach: ReturnType<typeof createSpy>
}

test.group('ProfessionalsService', (group) => {
  let professionalModel: ReturnType<typeof createModelMock>
  let examModel: ReturnType<typeof createModelMock>
  let procedureModel: ReturnType<typeof createModelMock>
  let service: ProfessionalsService

  const attachExamValidator = createSpy(async (payload: Record<string, unknown>) => payload)
  const attachProcedureValidator = createSpy(async (payload: Record<string, unknown>) => payload)

  const mockRelations = (builderOptions: Record<string, unknown> = {}) => {
    return {
      exams: {
        query: createSpy(() => createQueryBuilderMock(builderOptions)),
        attach: createSpy(async () => {}),
        detach: createSpy(async () => {}),
      },
      procedures: {
        query: createSpy(() => createQueryBuilderMock(builderOptions)),
        attach: createSpy(async () => {}),
        detach: createSpy(async () => {}),
      },
    } as Record<'exams' | 'procedures', RelationMocks>
  }

  const mockProfessionalRecord = (relations: ReturnType<typeof mockRelations>) => {
    return createRecordMock({
      attributes: { id: 'professional-1' },
      related: (relation) => relations[relation as keyof typeof relations],
    })
  }

  const setupWithRelations = (relations: ReturnType<typeof mockRelations>) => {
    professionalModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: mockProfessionalRecord(relations) })
    )
  }

  group.each.setup(() => {
    attachExamValidator.mockReset()
    attachProcedureValidator.mockReset()
    professionalModel = createModelMock()
    examModel = createModelMock()
    procedureModel = createModelMock()
    const createValidator = createSpy(async () => professionalPayload())
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    service = new ProfessionalsService({
      model: professionalModel,
      examModel,
      procedureModel,
      createValidator: { validate: createValidator },
      updateValidator: { validate: updateValidator },
      attachExamValidator: { validate: attachExamValidator },
      attachProcedureValidator: { validate: attachProcedureValidator },
    })
  })

  test('listExams retorna os exames serializados ordenados por nome', async ({ assert }) => {
    const relations = mockRelations({
      result: [createRecordMock({ serialized: serializedExam() })],
    })
    setupWithRelations(relations)

    const result = await service.listExams('professional-1')

    assert.deepEqual(result, [serializedExam()])
    assert.isTrue(relations.exams.query.calledTimes() === 1)
  })

  test('listExams lança 404 quando o profissional não existe', async ({ assert }) => {
    professionalModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.listExams('professional-invalid'), { status: 404 })
  })

  test('attachExam vincula o exame e retorna a lista atualizada', async ({ assert }) => {
    const id = examId()
    const relations = mockRelations()
    relations.exams.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: null,
        result: [createRecordMock({ serialized: serializedExam({ id }) })],
      })
    )
    setupWithRelations(relations)
    examModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))

    const result = await service.attachExam('professional-1', { exam_id: id })

    assert.deepEqual(result, [serializedExam({ id })])
    assert.isTrue(relations.exams.attach.calledWith([id]))
    assert.isTrue(attachExamValidator.calledTimes() === 1)
  })

  test('attachExam lança 404 quando o exame não existe', async ({ assert }) => {
    const relations = mockRelations()
    setupWithRelations(relations)
    examModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.attachExam('professional-1', { exam_id: examId() }), {
      status: 404,
      message: 'Exam not found',
    })
    assert.isTrue(relations.exams.attach.calledTimes() === 0)
  })

  test('attachExam lança 409 quando o exame já está vinculado', async ({ assert }) => {
    const id = examId()
    const relations = mockRelations()
    relations.exams.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))
    setupWithRelations(relations)
    examModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))

    await expectError(assert, () => service.attachExam('professional-1', { exam_id: id }), {
      status: 409,
      message: 'Exam already linked to professional',
    })
  })

  test('detachExam desvincula o exame quando o vínculo existe', async ({ assert }) => {
    const id = examId()
    const relations = mockRelations()
    relations.exams.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))
    setupWithRelations(relations)

    const result = await service.detachExam('professional-1', id)

    assert.isTrue(result)
    assert.isTrue(relations.exams.detach.calledWith([id]))
  })

  test('detachExam lança 404 quando o vínculo não existe', async ({ assert }) => {
    const id = examId()
    const relations = mockRelations()
    relations.exams.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))
    setupWithRelations(relations)

    await expectError(assert, () => service.detachExam('professional-1', id), {
      status: 404,
      message: 'Exam link not found',
    })
    assert.isTrue(relations.exams.detach.calledTimes() === 0)
  })

  test('listProcedures retorna os procedimentos serializados ordenados por nome', async ({
    assert,
  }) => {
    const relations = mockRelations({
      result: [createRecordMock({ serialized: serializedProcedure() })],
    })
    setupWithRelations(relations)

    const result = await service.listProcedures('professional-1')

    assert.deepEqual(result, [serializedProcedure()])
    assert.isTrue(relations.procedures.query.calledTimes() === 1)
  })

  test('attachProcedure vincula o procedimento e retorna a lista atualizada', async ({
    assert,
  }) => {
    const id = procedureId()
    const relations = mockRelations()
    relations.procedures.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: null,
        result: [createRecordMock({ serialized: serializedProcedure({ id }) })],
      })
    )
    setupWithRelations(relations)
    procedureModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))

    const result = await service.attachProcedure('professional-1', { procedure_id: id })

    assert.deepEqual(result, [serializedProcedure({ id })])
    assert.isTrue(relations.procedures.attach.calledWith([id]))
  })

  test('attachProcedure lança 404 quando o procedimento não existe', async ({ assert }) => {
    const relations = mockRelations()
    setupWithRelations(relations)
    procedureModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(
      assert,
      () => service.attachProcedure('professional-1', { procedure_id: procedureId() }),
      { status: 404, message: 'Procedure not found' }
    )
  })

  test('attachProcedure lança 409 quando o procedimento já está vinculado', async ({ assert }) => {
    const id = procedureId()
    const relations = mockRelations()
    relations.procedures.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))
    setupWithRelations(relations)
    procedureModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))

    await expectError(
      assert,
      () => service.attachProcedure('professional-1', { procedure_id: id }),
      { status: 409, message: 'Procedure already linked to professional' }
    )
  })

  test('detachProcedure desvincula o procedimento quando o vínculo existe', async ({ assert }) => {
    const id = procedureId()
    const relations = mockRelations()
    relations.procedures.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))
    setupWithRelations(relations)

    const result = await service.detachProcedure('professional-1', id)

    assert.isTrue(result)
    assert.isTrue(relations.procedures.detach.calledWith([id]))
  })

  test('detachProcedure lança 404 quando o vínculo não existe', async ({ assert }) => {
    const id = procedureId()
    const relations = mockRelations()
    relations.procedures.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: null })
    )
    setupWithRelations(relations)

    await expectError(assert, () => service.detachProcedure('professional-1', id), {
      status: 404,
      message: 'Procedure link not found',
    })
  })

  test('create lança 409 quando o documento do profissional já existe', async ({ assert }) => {
    professionalModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))

    await expectError(assert, () => service.create(professionalPayload()), {
      status: 409,
      message: 'Professional document already exists',
    })
  })

  test('read aplica os preloads padrão de exames e procedimentos', async ({ assert }) => {
    const builder = createQueryBuilderMock({
      firstResult: createRecordMock({ serialized: { id: 'professional-1' } }),
    })
    professionalModel.query.mockImplementation(() => builder)

    await service.read('professional-1')

    assert.isTrue(builder.preload.calledWith('exams'))
    assert.isTrue(builder.preload.calledWith('procedures'))
  })

  test('delete aplica soft delete para profissionais', async ({ assert }) => {
    const record = createRecordMock({ attributes: { id: 'professional-1' } })
    const builder = createQueryBuilderMock({ firstResult: record })
    professionalModel.query.mockImplementation(() => builder)

    await service.delete('professional-1')

    assert.isTrue(record.delete.calledTimes() === 0)
    assert.isTrue(record.save.calledTimes() === 1)
  })

  test('consulta ignora profissionais com soft delete', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: null })
    professionalModel.query.mockImplementation(() => builder)

    await expectError(assert, () => service.read('professional-removed'), { status: 404 })

    assert.isTrue(builder.whereNull.calledWith('deleted_at'))
  })
})
