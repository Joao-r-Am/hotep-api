import { IScheduleSlot } from '../../../app/interfaces/schedule-slot.interface.js'

let sequence = 0

export function scheduleSlotId() {
  sequence += 1
  return `schedule-slot-${sequence}`
}

export function makeScheduleSlot(
  overrides: Partial<IScheduleSlot> = {}
): Record<string, unknown> & { id: string } {
  return {
    id: scheduleSlotId(),
    professional_id: 'professional-1',
    start_time: '2026-08-20T09:00:00.000Z',
    end_time: '2026-08-20T09:30:00.000Z',
    status: 'available',
    ...overrides,
  }
}

export function scheduleSlotPayload(overrides: Record<string, unknown> = {}) {
  return {
    professional_id: 'professional-1',
    start_time: '2026-08-20T09:00:00.000Z',
    end_time: '2026-08-20T09:30:00.000Z',
    status: 'available',
    ...overrides,
  }
}

export function serializedScheduleSlot(overrides: Record<string, unknown> = {}) {
  return {
    id: 'schedule-slot-1',
    professional_id: 'professional-1',
    start_time: '2026-08-20T09:00:00.000Z',
    end_time: '2026-08-20T09:30:00.000Z',
    status: 'available',
    ...overrides,
  }
}
