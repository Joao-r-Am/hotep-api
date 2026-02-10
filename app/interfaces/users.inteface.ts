import { UUID } from 'crypto'
import { DateTime } from 'luxon'

export interface IUser {
  id: UUID
  name: string
  cnpjf: string
  password: string
  email: string
  phone: string
  site_page: string
  birthday: DateTime
  access_type: AccessType
  especialty_area: EspecialtyArea
  roles: Array<string>
  logo: string
  max_users: number
  sub_expires_at: DateTime
  active: boolean
  deleted_at: DateTime
  createdAt: DateTime
  updatedAt: DateTime | null
}

export enum AccessType {
  ADMIN = 1,
  BASIC = 2,
  GUEST = 3,
  PREMIUM = 4
}

export enum EspecialtyArea {
  PSYCHOLOGIST = 'psychologist',
  SPEECH_THERAPIST = 'speech_therapist',
  NUTRITIONIST = 'nutritionist',
  PHYSIOTHERAPIST = 'physiotherapist',
  DENTIST = 'dentist',
  PHARMACIST = 'pharmacist',
  NURSE = 'nurse',
  OCCUPATIONAL_THERAPIST = 'occupational_therapist'
}
