import { IAppointment } from '../../../app/interfaces/appointment.interface.js'

let sequence = 0

export function appointmentId() {
  sequence += 1
  return `appointment-${sequence}`
}

export function makeAppointment(
  overrides: Partial<IAppointment> = {}
): Record<string, unknown> & { id: string } {
  return {
    id: appointmentId(),
    patient_id: 'patient-1',
    professional_id: 'professional-1',
    start_time: '2026-08-20T09:00:00.000Z',
    end_time: '2026-08-20T09:30:00.000Z',
    status: 'scheduled',
    ...overrides,
  }
}

export function appointmentPayload(overrides: Record<string, unknown> = {}) {
  return {
    patient_id: 'patient-1',
    professional_id: 'professional-1',
    exam_id: 'exam-1',
    procedure_id: 'procedure-1',
    schedule_slot_id: 'schedule-slot-1',
    start_time: '2026-08-20T09:00:00.000Z',
    end_time: '2026-08-20T09:30:00.000Z',
    status: 'scheduled',
    ...overrides,
  }
}

export function serializedAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'appointment-1',
    patient_id: 'patient-1',
    professional_id: 'professional-1',
    exam_id: 'exam-1',
    procedure_id: 'procedure-1',
    schedule_slot_id: 'schedule-slot-1',
    start_time: '2026-08-20T09:00:00.000Z',
    end_time: '2026-08-20T09:30:00.000Z',
    status: 'scheduled',
    ...overrides,
  }
}
