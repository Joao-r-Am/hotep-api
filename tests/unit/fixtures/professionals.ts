import { IProfessional } from '../../../app/interfaces/professional.interface.js'

let sequence = 0

export function professionalId() {
  sequence += 1
  return `professional-${sequence}`
}

export function makeProfessional(
  overrides: Partial<IProfessional> = {}
): Record<string, unknown> & { id: string } {
  return {
    id: professionalId(),
    name: 'Dr. João Souza',
    document: '987.654.321-00',
    specialty: 'Cardiologia',
    registration_number: 'CRM-12345',
    phone: '(11) 98888-0000',
    email: 'joao.souza@example.com',
    ...overrides,
  }
}

export function professionalPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Dr. João Souza',
    document: '987.654.321-00',
    specialty: 'Cardiologia',
    registration_number: 'CRM-12345',
    phone: '(11) 98888-0000',
    email: 'joao.souza@example.com',
    ...overrides,
  }
}

export function serializedProfessional(overrides: Record<string, unknown> = {}) {
  return {
    id: 'professional-1',
    name: 'Dr. João Souza',
    document: '987.654.321-00',
    specialty: 'Cardiologia',
    registration_number: 'CRM-12345',
    phone: '(11) 98888-0000',
    email: 'joao.souza@example.com',
    ...overrides,
  }
}

export function serializedExam(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-1',
    code: 'ECO',
    name: 'Ecocardiograma',
    type: 'image',
    duration_minutes: 30,
    ...overrides,
  }
}

export function serializedProcedure(overrides: Record<string, unknown> = {}) {
  return {
    id: 'procedure-1',
    name: 'Cateterismo',
    description: 'Procedimento cardíaco',
    duration_minutes: 60,
    ...overrides,
  }
}
