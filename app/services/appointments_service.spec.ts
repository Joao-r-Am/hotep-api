import { test } from '@japa/runner'
import AppointmentsService from './appointments-services.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'
import {
  appointmentPayload,
  serializedAppointment,
} from '../../tests/unit/fixtures/appointments.js'

test.group('AppointmentsService', (group) => {
  let model: ModelMock
  let patientModel: ModelMock
  let professionalModel: ModelMock
  let examModel: ModelMock
  let procedureModel: ModelMock
  let scheduleSlotModel: ModelMock
  let service: AppointmentsService

  const mockRelationExists = (mocks: ModelMock[]) => {
    mocks.forEach((mock) =>
      mock.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))
    )
  }

  group.each.setup(() => {
    model = createModelMock()
    patientModel = createModelMock()
    professionalModel = createModelMock()
    examModel = createModelMock()
    procedureModel = createModelMock()
    scheduleSlotModel = createModelMock()
    const createValidator = createSpy(async () => appointmentPayload())
    const updateValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    service = new AppointmentsService({
      model: asLucidModel(model),
      patientModel,
      professionalModel,
      examModel,
      procedureModel,
      scheduleSlotModel,
      createValidator: { validate: createValidator },
      updateValidator: { validate: updateValidator },
    })
  })

  test('create valida todas as relações e cria o agendamento', async ({ assert }) => {
    mockRelationExists([
      patientModel,
      professionalModel,
      examModel,
      procedureModel,
      scheduleSlotModel,
    ])
    const record = createRecordMock({ attributes: { id: 'appointment-1' } })
    model.create = createSpy(async () => record)
    const readBuilder = createQueryBuilderMock({
      firstResult: createRecordMock({ serialized: serializedAppointment() }),
    })
    model.query.mockImplementation(() => readBuilder)

    const result = await service.create(appointmentPayload())

    assert.deepEqual(result, serializedAppointment())
    assert.isTrue(patientModel.query.calledTimes() === 1)
    assert.isTrue(professionalModel.query.calledTimes() === 1)
    assert.isTrue(examModel.query.calledTimes() === 1)
    assert.isTrue(procedureModel.query.calledTimes() === 1)
    assert.isTrue(scheduleSlotModel.query.calledTimes() === 1)
  })

  test('create lança 404 quando o paciente não existe', async ({ assert }) => {
    patientModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.create(appointmentPayload()), {
      status: 404,
      message: 'Patient not found',
    })
    assert.isTrue(model.create.calledTimes() === 0)
  })

  test('create lança 404 quando o profissional não existe', async ({ assert }) => {
    patientModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: {} }))
    professionalModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.create(appointmentPayload()), {
      status: 404,
      message: 'Professional not found',
    })
  })

  test('create lança 404 quando o exame não existe', async ({ assert }) => {
    mockRelationExists([patientModel, professionalModel])
    examModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.create(appointmentPayload()), {
      status: 404,
      message: 'Exam not found',
    })
  })

  test('create lança 404 quando o procedimento não existe', async ({ assert }) => {
    mockRelationExists([patientModel, professionalModel, examModel])
    procedureModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.create(appointmentPayload()), {
      status: 404,
      message: 'Procedure not found',
    })
  })

  test('create lança 404 quando o schedule slot não pertence ao profissional', async ({
    assert,
  }) => {
    mockRelationExists([patientModel, professionalModel, examModel, procedureModel])
    scheduleSlotModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.create(appointmentPayload()), {
      status: 404,
      message: 'Schedule slot not found for professional',
    })
  })

  test('create verifica o schedule slot escopado pelo profissional validado', async ({
    assert,
  }) => {
    const createValidator = createSpy(async () =>
      appointmentPayload({ professional_id: 'professional-2' })
    )
    service = new AppointmentsService({
      model: asLucidModel(model),
      patientModel,
      professionalModel,
      examModel,
      procedureModel,
      scheduleSlotModel,
      createValidator: { validate: createValidator },
    })
    mockRelationExists([patientModel, professionalModel, examModel, procedureModel])
    const slotBuilder = createQueryBuilderMock({ firstResult: {} })
    scheduleSlotModel.query.mockImplementation(() => slotBuilder)
    const record = createRecordMock({ attributes: { id: 'appointment-1' } })
    model.create = createSpy(async () => record)
    model.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: createRecordMock({ serialized: serializedAppointment() }),
      })
    )

    await service.create(appointmentPayload({ professional_id: 'professional-2' }))

    assert.isTrue(slotBuilder.where.calledWith('id', appointmentPayload().schedule_slot_id))
    assert.isTrue(slotBuilder.where.calledWith('professional_id', 'professional-2'))
  })

  test('update preserva as relações do registro quando não enviadas', async ({ assert }) => {
    const record = createRecordMock({
      attributes: {
        id: 'appointment-1',
        patient_id: 'patient-1',
        professional_id: 'professional-1',
        exam_id: null,
        procedure_id: null,
        schedule_slot_id: null,
      },
    })
    const findBuilder = createQueryBuilderMock({ firstResult: record })
    model.query.mockImplementation(() => findBuilder)
    mockRelationExists([
      patientModel,
      professionalModel,
      examModel,
      procedureModel,
      scheduleSlotModel,
    ])

    const result = await service.update('appointment-1', { status: 'completed' })

    assert.isTrue(record.merge.calledWith({ status: 'completed' }))
    assert.isTrue(record.save.calledTimes() === 1)
    assert.isTrue(patientModel.query.calledTimes() === 1)
    assert.isTrue(professionalModel.query.calledTimes() === 1)
    assert.isTrue(examModel.query.calledTimes() === 0)
    assert.isTrue(procedureModel.query.calledTimes() === 0)
    assert.isTrue(scheduleSlotModel.query.calledTimes() === 0)
    assert.isNotNull(result)
  })

  test('update lança 404 quando o agendamento não existe', async ({ assert }) => {
    const findBuilder = createQueryBuilderMock({ firstResult: null })
    model.query.mockImplementation(() => findBuilder)

    await expectError(
      assert,
      () => service.update('appointment-invalid', { status: 'completed' }),
      {
        status: 404,
      }
    )
  })
})
