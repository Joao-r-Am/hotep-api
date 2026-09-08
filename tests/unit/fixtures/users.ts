import { IUser } from '../../../app/interfaces/users.inteface.js'
import { AccessType, EspecialtyArea } from '../../../app/interfaces/users.inteface.js'

let sequence = 0

export function userId() {
  sequence += 1
  return `user-${sequence}`
}

export function makeUser(overrides: Partial<IUser> = {}): Record<string, unknown> & { id: string } {
  return {
    id: userId(),
    name: 'Ana',
    lastname: 'Oliveira',
    username: 'a.oliveira',
    cnpjf: '12345678901',
    password: 'hash-senha-segura',
    email: 'ana.oliveira@example.com',
    phone: '11999990000',
    access_type: AccessType.BASIC,
    especialty_area: EspecialtyArea.CLINIC,
    active: false,
    ...overrides,
  }
}

type RegisterUser = Pick<
  IUser,
  'email' | 'name' | 'password' | 'cnpjf' | 'phone' | 'especialty_area' | 'access_type' | 'lastname'
>

export function registerPayload(overrides: Record<string, unknown> = {}): RegisterUser {
  return {
    name: 'Ana',
    lastname: 'Oliveira',
    cnpjf: '12345678901',
    phone: '11999990000',
    especialty_area: EspecialtyArea.CLINIC,
    access_type: AccessType.BASIC,
    email: 'ana.oliveira@example.com',
    password: 'senha123',
    ...(overrides as Partial<RegisterUser>),
  }
}

export function userAttributes(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    name: 'Ana',
    lastname: 'Oliveira',
    username: 'a.oliveira',
    cnpjf: '12345678901',
    password: 'hash-senha-segura',
    email: 'ana.oliveira@example.com',
    phone: '11999990000',
    access_type: AccessType.BASIC,
    especialty_area: EspecialtyArea.CLINIC,
    active: false,
    ...overrides,
  }
}
