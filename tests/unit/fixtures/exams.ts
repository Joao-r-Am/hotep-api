import { IExam } from '../../../app/interfaces/exam.interface.js'

let sequence = 0

export function examId() {
  sequence += 1
  return `exam-${sequence}`
}

export function makeExam(overrides: Partial<IExam> = {}): Record<string, unknown> & { id: string } {
  return {
    id: examId(),
    code: 'ECO',
    name: 'Ecocardiograma',
    type: 'image',
    specialty: 'Cardiologia',
    description: 'Ultrassom do coração',
    preparation_instructions: 'Jejum de 4 horas',
    duration_minutes: 30,
    tags: ['cardio', 'ultrassom'],
    ...overrides,
  }
}

export function examPayload(overrides: Record<string, unknown> = {}) {
  return {
    code: 'ECO',
    name: 'Ecocardiograma',
    type: 'image',
    specialty: 'Cardiologia',
    description: 'Ultrassom do coração',
    preparation_instructions: 'Jejum de 4 horas',
    duration_minutes: 30,
    tags: ['cardio', 'ultrassom'],
    ...overrides,
  }
}

export function serializedExam(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exam-1',
    code: 'ECO',
    name: 'Ecocardiograma',
    type: 'image',
    specialty: 'Cardiologia',
    description: 'Ultrassom do coração',
    preparation_instructions: 'Jejum de 4 horas',
    duration_minutes: 30,
    tags: ['cardio', 'ultrassom'],
    ...overrides,
  }
}
