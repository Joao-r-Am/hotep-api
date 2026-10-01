import { test } from '@japa/runner'
import AvailabilityService, { computeDayAvailability } from './availability-service.js'
import type { DayAvailability } from './availability-service.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createModelMock, withBuilder } from '../../tests/unit/helpers/model_mocks.js'

const TZ_SP = 'America/Sao_Paulo'

type SlotFixture = {
  id: string
  start_time: string
  end_time: string
  status: string
}

const slot = (overrides: Partial<SlotFixture> = {}): SlotFixture => ({
  id: 'slot-1',
  start_time: '2026-08-20T09:00:00.000Z',
  end_time: '2026-08-20T09:30:00.000Z',
  status: 'AVAILABLE',
  ...overrides,
})

test.group('AvailabilityService', () => {
  test('slot bloqueado é excluído', ({ assert }) => {
    const slots = [slot({ id: 'slot-available' }), slot({ id: 'slot-blocked', status: 'BLOCKED' })]

    const result = computeDayAvailability(slots, [], null, TZ_SP)

    assert.equal(result[0].slots.length, 1)
    assert.equal(result[0].slots[0].schedule_slot_id, 'slot-available')
  })

  test('appointment ativo ocupa o slot, mas cancelado libera', ({ assert }) => {
    const slots = [
      slot({ id: 'slot-busy' }),
      slot({ id: 'slot-free' }),
      slot({ id: 'slot-cancelled' }),
    ]
    const appointments = [
      { schedule_slot_id: 'slot-busy', status: 'CONFIRMED', deleted_at: null },
      { schedule_slot_id: 'slot-cancelled', status: 'CANCELLED', deleted_at: null },
    ]

    const result = computeDayAvailability(slots, appointments, null, TZ_SP)

    const ids = result[0].slots.map((s) => s.schedule_slot_id)
    assert.deepEqual(ids, ['slot-free', 'slot-cancelled'])
  })

  test('duração do procedimento maior que o slot exclui o slot', ({ assert }) => {
    const slots = [
      slot({ id: 'slot-30min' }),
      slot({
        id: 'slot-60min',
        start_time: '2026-08-20T10:00:00.000Z',
        end_time: '2026-08-20T11:00:00.000Z',
      }),
    ]

    const result = computeDayAvailability(slots, [], 60, TZ_SP)

    assert.equal(result[0].slots.length, 1)
    assert.equal(result[0].slots[0].schedule_slot_id, 'slot-60min')
  })

  test('fuso horário da clínica é respeitado', ({ assert }) => {
    const slots = [
      slot({ start_time: '2026-08-20T00:00:00.000Z', end_time: '2026-08-20T00:30:00.000Z' }),
    ]

    const result = computeDayAvailability(slots, [], null, TZ_SP)

    // 00:00Z = 21:00 do dia anterior em -03:00 → agrupa em 2026-08-19.
    assert.equal(result[0].date, '2026-08-19')
    assert.equal(result[0].slots[0].start_time, '2026-08-20T00:00:00.000Z')
  })

  test('intervalo de from/to é limitado a 60 dias', async ({ assert }) => {
    const scheduleSlotModel = createModelMock()
    const appointmentModel = createModelMock()
    const slotBuilder = createQueryBuilderMock({ result: [] })
    withBuilder(scheduleSlotModel, slotBuilder)
    withBuilder(appointmentModel, createQueryBuilderMock({ result: [] }))

    const service = new AvailabilityService({ scheduleSlotModel, appointmentModel })
    const from = new Date('2026-08-01T00:00:00.000Z')
    const to = new Date('2026-12-01T00:00:00.000Z')

    const result: DayAvailability[] = await service.findAvailability({
      professionalId: 'professional-1',
      procedureDurationMinutes: 30,
      from,
      to,
      timezone: TZ_SP,
    })

    assert.equal(result.length, 0)
    assert.isTrue(slotBuilder.where.calledWith('start_time', '<=', '2026-09-30T00:00:00.000Z'))
  })

  test('intervalo invertido retorna lista vazia', async ({ assert }) => {
    const service = new AvailabilityService({})
    const result = await service.findAvailability({
      professionalId: 'professional-1',
      procedureDurationMinutes: 30,
      from: new Date('2026-09-01T00:00:00.000Z'),
      to: new Date('2026-08-01T00:00:00.000Z'),
      timezone: TZ_SP,
    })

    assert.deepEqual(result, [])
  })
})
