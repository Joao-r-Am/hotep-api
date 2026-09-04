import { DateTime } from 'luxon'

let sequence = 0

export function codeId() {
  sequence += 1
  return `code-${sequence}`
}

export function makeCode(overrides: Record<string, unknown> = {}) {
  return {
    id: codeId(),
    code: 'ABC123',
    user_id: 'user-1',
    expires_at: DateTime.now().plus({ days: 1 }),
    ...overrides,
  }
}

export function expiredCode() {
  return makeCode({ expires_at: DateTime.now().minus({ minutes: 1 }) })
}

export function codeAttributes(overrides: Record<string, unknown> = {}) {
  return {
    id: 'code-1',
    code: 'ABC123',
    user_id: 'user-1',
    expires_at: DateTime.now().plus({ days: 1 }),
    ...overrides,
  }
}
