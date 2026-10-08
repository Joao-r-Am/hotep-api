import { test } from '@japa/runner'
import PatientsService from './patients-services.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'
import { patientPayload, serializedPatient } from '../../tests/unit/fixtures/patients.js'

test.group('PatientsService', (group) => {
  let model: ModelMock
  let service: PatientsService

  group.each.setup(() => {
    model = createModelMock()
    const createValidator = createSpy(async () => patientPayload())
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    service = new PatientsService({
      model: asLucidModel(model),
      createValidator: { validate: createValidator },
      updateValidator: { validate: updateValidator },
    })
  })

  test('create usa o validador, checa documento duplicado e retorna o serializado', async ({
    assert,
  }) => {
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => builder)
    model.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload, serialized: serializedPatient() })
    )

    const result = await service.create(patientPayload())

    assert.deepEqual(result, serializedPatient())
    assert.isTrue(builder.where.calledWith('document', patientPayload().document))
  })

  test('create lança 409 quando o documento já existe', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: {} })
    model.query.mockImplementation(() => builder)

    await expectError(assert, () => service.create(patientPayload()), {
      status: 409,
      message: 'Patient document already exists',
    })
    assert.isTrue(model.create.calledTimes() === 0)
  })

  test('update não conflita com o próprio registro ao checar o documento', async ({ assert }) => {
    const record = createRecordMock({ attributes: { ...patientPayload(), id: 'patient-1' } })
    const findBuilder = createQueryBuilderMock({ firstResult: record })
    const uniqueBuilder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() =>
      model.query.calledTimes() === 1 ? findBuilder : uniqueBuilder
    )

    const result = await service.update('patient-1', {
      name: 'Maria Souza',
      document: '123.456.789-00',
    })

    assert.isNotNull(result)
    assert.isTrue(uniqueBuilder.whereNot.calledWith('id', 'patient-1'))
  })

  test('delete aplica soft delete (deleted_at) para pacientes', async ({ assert }) => {
    const record = createRecordMock({ attributes: { id: 'patient-1' } })
    const builder = createQueryBuilderMock({ firstResult: record })
    model.query.mockImplementation(() => builder)

    await service.delete('patient-1')

    assert.isTrue(record.delete.calledTimes() === 0)
    assert.isTrue(record.save.calledTimes() === 1)
    assert.isNotNull(record.merge.calls[0]?.args[0]?.deleted_at)
  })

  test('consulta ignora registros com soft delete (whereNull deleted_at)', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => builder)

    await expectError(assert, () => service.read('patient-removed'), { status: 404 })

    assert.isTrue(builder.whereNull.calledWith('deleted_at'))
  })
})
