import { test } from '@japa/runner'
import BaseCrudService from './base-crud-service.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createPaginatorMock } from '../../tests/unit/helpers/mock_paginator.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'
import { serializedPatient, patientId, patientPayload } from '../../tests/unit/fixtures/patients.js'

test.group('BaseCrudService', (group) => {
  let model: ModelMock
  let service: BaseCrudService

  const setupService = (config: Record<string, unknown> = {}) => {
    service = new BaseCrudService({
      model: asLucidModel(model),
      notFoundMessage: 'Patient not found',
      ...config,
    })
  }

  const mockCreatedRecord = (serialized: Record<string, unknown> = serializedPatient()) => {
    model.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload, serialized })
    )
  }

  group.each.setup(() => {
    model = createModelMock()
  })

  test('create valida o payload, checa campos únicos e cria o registro', async ({ assert }) => {
    const payload = patientPayload({ document: '111.222.333-44' })
    const createValidator = createSpy(async () => payload)
    mockCreatedRecord(serializedPatient({ document: '111.222.333-44' }))
    setupService({
      createValidator: { validate: createValidator },
      uniqueFields: [{ field: 'document', message: 'Patient document already exists' }],
    })

    const result = await service.create(payload)

    assert.isTrue(createValidator.calledTimes() === 1)
    assert.isTrue(model.create.calledTimes() === 1)
    assert.deepEqual(model.create.calls[0].args[0], payload)
    assert.deepEqual(result, serializedPatient({ document: '111.222.333-44' }))
  })

  test('create retorna o payload sem validação quando não há validator configurado', async ({
    assert,
  }) => {
    mockCreatedRecord()
    setupService()

    const result = await service.create(patientPayload())

    assert.deepEqual(result, serializedPatient())
    assert.isTrue(model.create.calledTimes() === 1)
  })

  test('create lança 409 quando o campo único já existe', async ({ assert }) => {
    const createValidator = createSpy(async () => patientPayload())
    const builder = createQueryBuilderMock({ firstResult: {} })

    model.query.mockImplementation(() => builder)
    setupService({
      createValidator: { validate: createValidator },
      uniqueFields: [{ field: 'document', message: 'Patient document already exists' }],
    })

    await expectError(assert, () => service.create(patientPayload()), {
      status: 409,
      message: 'Patient document already exists',
    })
    assert.isTrue(model.create.calledTimes() === 0)
  })

  test('create ignora o campo único quando o valor não é informado', async ({ assert }) => {
    const createValidator = createSpy(async () => patientPayload({ document: undefined }))
    mockCreatedRecord()
    model.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))
    setupService({
      createValidator: { validate: createValidator },
      uniqueFields: [{ field: 'document', message: 'Patient document already exists' }],
    })

    await service.create(patientPayload())

    assert.isTrue(model.query.calledTimes() === 0)
    assert.isTrue(model.create.calledTimes() === 1)
  })

  test('read retorna o registro serializado quando encontrado', async ({ assert }) => {
    const id = patientId()
    const builder = createQueryBuilderMock({
      firstResult: createRecordMock({ serialized: serializedPatient() }),
    })
    model.query.mockImplementation(() => builder)
    setupService({ defaultReadPreloads: ['appointments'] })

    const result = await service.read(id, [])

    assert.deepEqual(result, serializedPatient())
    assert.isTrue(builder.where.calledWith('id', id))
  })

  test('read lança 404 quando o registro não existe', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => builder)
    setupService()

    await expectError(assert, () => service.read(patientId()), {
      status: 404,
      message: 'Patient not found',
    })
  })

  test('read deduplica preloads padrão e informados', async ({ assert }) => {
    const builder = createQueryBuilderMock({
      firstResult: createRecordMock({ serialized: serializedPatient() }),
    })
    model.query.mockImplementation(() => builder)
    setupService({ defaultReadPreloads: ['appointments'] })

    await service.read(patientId(), ['appointments', 'doctors'])

    assert.isTrue(builder.preload.calledTimes() === 2)
    assert.deepEqual(builder.preload.calls.map((call) => call.args[0]).sort(), [
      'appointments',
      'doctors',
    ])
  })

  test('list aplica ordem, preloads e paginação', async ({ assert }) => {
    const records = [createRecordMock({ serialized: serializedPatient() })]
    const paginator = createPaginatorMock(records)
    const builder = createQueryBuilderMock({ result: records })
    builder.paginate = createSpy(async () => paginator)
    model.query.mockImplementation(() => builder)
    setupService()

    const result = await service.list({ page: 2, limit: 10, preloads: ['appointments'] })

    assert.isTrue(builder.orderBy.calledWith('created_at', 'desc'))
    assert.isTrue(builder.preload.calledWith('appointments'))
    assert.isTrue(builder.paginate.calledWith(2, 10))
    assert.deepEqual(result.data, [serializedPatient()])
    assert.deepEqual(result.meta, paginator.getMeta())
  })

  test('update busca o registro, valida, mescla e salva', async ({ assert }) => {
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    const record = createRecordMock({ attributes: { ...patientPayload(), id: 'patient-1' } })
    const builder = createQueryBuilderMock({ firstResult: record })
    model.query.mockImplementation(() => builder)
    setupService({ updateValidator: { validate: updateValidator } })

    const result = await service.update('patient-1', { name: 'Maria Souza' })

    assert.deepEqual(record.merge.calls[0].args[0], { name: 'Maria Souza' })
    assert.isTrue(record.merge.calledTimes() === 1)
    assert.isTrue(record.save.calledTimes() === 1)
    assert.isNotNull(result)
  })

  test('update lança 404 quando o registro não existe', async ({ assert }) => {
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => builder)
    setupService({ updateValidator: { validate: updateValidator } })

    await expectError(assert, () => service.update('patient-invalid', { name: 'Maria' }), {
      status: 404,
    })
  })

  test('update lança 409 quando o campo único pertence a outro registro', async ({ assert }) => {
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    const record = createRecordMock({ attributes: { ...patientPayload(), id: 'patient-1' } })
    const findBuilder = createQueryBuilderMock({ firstResult: record })
    const conflictBuilder = createQueryBuilderMock({ firstResult: {} })
    model.query.mockImplementation(() =>
      model.query.calledTimes() === 1 ? findBuilder : conflictBuilder
    )
    setupService({
      updateValidator: { validate: updateValidator },
      uniqueFields: [{ field: 'document', message: 'duplicated' }],
    })

    await expectError(assert, () => service.update('patient-1', { document: '222.333.444-55' }), {
      status: 409,
    })
  })

  test('delete remove o registro fisicamente quando não há soft delete', async ({ assert }) => {
    const record = createRecordMock({ attributes: { id: 'patient-1' } })
    const builder = createQueryBuilderMock({ firstResult: record })
    model.query.mockImplementation(() => builder)
    setupService()

    const result = await service.delete('patient-1')

    assert.isTrue(result)
    assert.isTrue(record.delete.calledTimes() === 1)
    assert.isTrue(record.save.calledTimes() === 0)
  })

  test('delete aplica soft delete quando a coluna está configurada', async ({ assert }) => {
    const record = createRecordMock({ attributes: { id: 'patient-1' } })
    const builder = createQueryBuilderMock({ firstResult: record })
    model.query.mockImplementation(() => builder)
    setupService({ softDeleteColumn: 'deleted_at' })

    const result = await service.delete('patient-1')

    assert.isTrue(result)
    assert.isTrue(record.delete.calledTimes() === 0)
    assert.isTrue(record.save.calledTimes() === 1)
    assert.isNotNull(record.merge.calls[0]?.args[0]?.deleted_at)
  })

  test('delete lança 404 quando o registro não existe', async ({ assert }) => {
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => builder)
    setupService()

    await expectError(assert, () => service.delete('patient-invalid'), { status: 404 })
  })
})
