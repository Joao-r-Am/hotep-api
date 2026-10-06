import { test } from '@japa/runner'
import ExamsService from './exams-services.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'
import { examPayload, serializedExam } from '../../tests/unit/fixtures/exams.js'

test.group('ExamsService', (group) => {
  let model: ModelMock
  let service: ExamsService

  group.each.setup(() => {
    model = createModelMock()
    const createValidator = createSpy(async () => examPayload())
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    service = new ExamsService({
      model: asLucidModel(model),
      createValidator: { validate: createValidator },
      updateValidator: { validate: updateValidator },
    })
  })

  test('create usa o validador e checa código duplicado', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => builder)
    model.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload, serialized: serializedExam() })
    )

    const result = await service.create(examPayload())

    assert.deepEqual(result, serializedExam())
    assert.isTrue(builder.where.calledWith('code', examPayload().code))
  })

  test('create lança 409 quando o código do exame já existe', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: {} })
    model.query.mockImplementation(() => builder)

    await expectError(assert, () => service.create(examPayload()), {
      status: 409,
      message: 'Exam code already exists',
    })
  })

  test('update não conflita com o próprio exame ao checar o código', async ({ assert }) => {
    const record = createRecordMock({ attributes: { ...examPayload(), id: 'exam-1' } })
    const findBuilder = createQueryBuilderMock({ firstResult: record })
    const uniqueBuilder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() =>
      model.query.calledTimes() === 1 ? findBuilder : uniqueBuilder
    )

    const result = await service.update('exam-1', { name: 'Ecocardiograma 3D', code: 'ECO3D' })

    assert.isNotNull(result)
    assert.isTrue(uniqueBuilder.whereNot.calledWith('id', 'exam-1'))
  })

  test('delete aplica soft delete para exames', async ({ assert }) => {
    const record = createRecordMock({ attributes: { id: 'exam-1' } })
    const builder = createQueryBuilderMock({ firstResult: record })
    model.query.mockImplementation(() => builder)

    await service.delete('exam-1')

    assert.isTrue(record.delete.calledTimes() === 0)
    assert.isTrue(record.save.calledTimes() === 1)
  })

  test('consulta ignora exames com soft delete', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => builder)

    await expectError(assert, () => service.read('exam-removed'), { status: 404 })

    assert.isTrue(builder.whereNull.calledWith('deleted_at'))
  })
})
