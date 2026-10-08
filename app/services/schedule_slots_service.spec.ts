import { test } from '@japa/runner'
import ScheduleSlotsService from './schedule-slots-services.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'
import {
  scheduleSlotPayload,
  serializedScheduleSlot,
} from '../../tests/unit/fixtures/schedule_slots.js'

test.group('ScheduleSlotsService', (group) => {
  let model: ModelMock
  let professionalModel: ModelMock
  let service: ScheduleSlotsService

  const mockProfessionalExists = () => {
    professionalModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))
  }

  group.each.setup(() => {
    model = createModelMock()
    professionalModel = createModelMock()
    const createValidator = createSpy(async () => scheduleSlotPayload())
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    service = new ScheduleSlotsService({
      model: asLucidModel(model),
      professionalModel,
      createValidator: { validate: createValidator },
      updateValidator: { validate: updateValidator },
    })
  })

  test('create valida relações, checa disponibilidade e cria o slot', async ({ assert }) => {
    mockProfessionalExists()
    const availabilityBuilder = createQueryBuilderMock({ firstResult: null })
    const builder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() =>
      model.query.calledTimes() === 1 ? availabilityBuilder : builder
    )
    model.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload, serialized: serializedScheduleSlot() })
    )

    const result = await service.create(scheduleSlotPayload())

    assert.deepEqual(result, serializedScheduleSlot())
    assert.isTrue(
      availabilityBuilder.where.calledWith('professional_id', scheduleSlotPayload().professional_id)
    )
    assert.isTrue(
      availabilityBuilder.where.calledWith('start_time', scheduleSlotPayload().start_time)
    )
  })

  test('create lança 404 quando o profissional não existe', async ({ assert }) => {
    professionalModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.create(scheduleSlotPayload()), {
      status: 404,
      message: 'Professional not found',
    })
    assert.isTrue(model.create.calledTimes() === 0)
  })

  test('create lança 409 quando já existe slot para o profissional e horário', async ({
    assert,
  }) => {
    mockProfessionalExists()
    model.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))

    await expectError(assert, () => service.create(scheduleSlotPayload()), {
      status: 409,
      message: 'Schedule slot already exists for this professional and start time',
    })
  })

  test('update mantém o profissional/horário do registro quando não enviados', async ({
    assert,
  }) => {
    const record = createRecordMock({
      attributes: { ...scheduleSlotPayload(), id: 'schedule-slot-1' },
    })
    const findBuilder = createQueryBuilderMock({ firstResult: record })
    mockProfessionalExists()
    const availabilityBuilder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() =>
      model.query.calledTimes() === 1 ? findBuilder : availabilityBuilder
    )

    const result = await service.update('schedule-slot-1', { status: 'busy' })

    assert.isTrue(
      availabilityBuilder.where.calledWith('professional_id', scheduleSlotPayload().professional_id)
    )
    assert.isTrue(
      availabilityBuilder.where.calledWith('start_time', scheduleSlotPayload().start_time)
    )
    assert.isNotNull(result)
  })

  test('update exclui o próprio slot da checagem de disponibilidade', async ({ assert }) => {
    const record = createRecordMock({
      attributes: { ...scheduleSlotPayload(), id: 'schedule-slot-1' },
    })
    const findBuilder = createQueryBuilderMock({ firstResult: record })
    mockProfessionalExists()
    const availabilityBuilder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() =>
      model.query.calledTimes() === 1 ? findBuilder : availabilityBuilder
    )

    await service.update('schedule-slot-1', { status: 'busy' })

    assert.isTrue(availabilityBuilder.whereNot.calledWith('id', 'schedule-slot-1'))
  })

  test('update lança 409 quando outro slot ocupa o horário', async ({ assert }) => {
    const record = createRecordMock({
      attributes: { ...scheduleSlotPayload(), id: 'schedule-slot-1' },
    })
    const findBuilder = createQueryBuilderMock({ firstResult: record })
    mockProfessionalExists()
    const availabilityBuilder = createQueryBuilderMock({ firstResult: {} })
    model.query.mockImplementation(() =>
      model.query.calledTimes() === 1 ? findBuilder : availabilityBuilder
    )

    await expectError(assert, () => service.update('schedule-slot-1', { status: 'busy' }), {
      status: 409,
    })
  })

  test('update lança 404 quando o slot não existe', async ({ assert }) => {
    const findBuilder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => findBuilder)

    await expectError(assert, () => service.update('schedule-slot-invalid', { status: 'busy' }), {
      status: 404,
    })
  })
})
