import { test } from '@japa/runner'
import ProceduresService from './procedures-services.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'
import { procedurePayload, serializedProcedure } from '../../tests/unit/fixtures/procedures.js'

test.group('ProceduresService', (group) => {
  let model: ModelMock
  let service: ProceduresService

  group.each.setup(() => {
    model = createModelMock()
    const createValidator = createSpy(async () => procedurePayload())
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    service = new ProceduresService({
      model: asLucidModel(model),
      createValidator: { validate: createValidator },
      updateValidator: { validate: updateValidator },
    })
  })

  test('create valida e cria o procedimento', async ({ assert }) => {
    model.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload, serialized: serializedProcedure() })
    )

    const result = await service.create(procedurePayload())

    assert.deepEqual(result, serializedProcedure())
    assert.isTrue(model.create.calledTimes() === 1)
  })

  test('create não possui campos únicos configurados', async ({ assert }) => {
    model.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload, serialized: serializedProcedure() })
    )

    await service.create(procedurePayload())

    assert.isTrue(model.query.calledTimes() === 0)
  })

  test('update valida, mescla e salva', async ({ assert }) => {
    const record = createRecordMock({ attributes: { ...procedurePayload(), id: 'procedure-1' } })
    const builder = createQueryBuilderMock({ firstResult: record })
    model.query.mockImplementation(() => builder)

    const result = await service.update('procedure-1', { duration_minutes: 90 })

    assert.isTrue(record.merge.calledWith({ duration_minutes: 90 }))
    assert.isTrue(record.save.calledTimes() === 1)
    assert.isNotNull(result)
  })

  test('update lança 404 quando o procedimento não existe', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => builder)

    await expectError(assert, () => service.update('procedure-invalid', { name: 'Novo' }), {
      status: 404,
    })
  })

  test('delete aplica soft delete para procedimentos', async ({ assert }) => {
    const record = createRecordMock({ attributes: { id: 'procedure-1' } })
    const builder = createQueryBuilderMock({ firstResult: record })
    model.query.mockImplementation(() => builder)

    await service.delete('procedure-1')

    assert.isTrue(record.delete.calledTimes() === 0)
    assert.isTrue(record.save.calledTimes() === 1)
  })
})
