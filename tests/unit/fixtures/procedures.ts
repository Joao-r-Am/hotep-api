import { IProcedure } from '../../../app/interfaces/procedure.interface.js'

let sequence = 0

export function procedureId() {
  sequence += 1
  return `procedure-${sequence}`
}

export function makeProcedure(
  overrides: Partial<IProcedure> = {}
): Record<string, unknown> & { id: string } {
  return {
    id: procedureId(),
    name: 'Cateterismo',
    description: 'Procedimento cardíaco invasivo',
    duration_minutes: 60,
    ...overrides,
  }
}

export function procedurePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Cateterismo',
    description: 'Procedimento cardíaco invasivo',
    duration_minutes: 60,
    ...overrides,
  }
}

export function serializedProcedure(overrides: Record<string, unknown> = {}) {
  return {
    id: 'procedure-1',
    name: 'Cateterismo',
    description: 'Procedimento cardíaco invasivo',
    duration_minutes: 60,
    ...overrides,
  }
}
