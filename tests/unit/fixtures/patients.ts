import { IPatient } from '../../../app/interfaces/patient.interface.js'

let sequence = 0

export function patientId() {
  sequence += 1
  return `patient-${sequence}`
}

export function makePatient(
  overrides: Partial<IPatient> = {}
): Record<string, unknown> & { id: string } {
  return {
    id: patientId(),
    name: 'Maria Silva',
    document: '123.456.789-00',
    birth_date: new Date('1990-05-10') as any,
    phone: '(11) 99999-0000',
    email: 'maria.silva@example.com',
    observations: 'Alérgica a penicilina',
    ...overrides,
  }
}

export function patientPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Maria Silva',
    document: '123.456.789-00',
    birth_date: '1990-05-10',
    phone: '(11) 99999-0000',
    email: 'maria.silva@example.com',
    observations: 'Alérgica a penicilina',
    ...overrides,
  }
}

export function serializedPatient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'patient-1',
    name: 'Maria Silva',
    document: '123.456.789-00',
    birth_date: '1990-05-10',
    phone: '(11) 99999-0000',
    email: 'maria.silva@example.com',
    observations: 'Alérgica a penicilina',
    ...overrides,
  }
}
