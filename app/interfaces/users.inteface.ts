import { DateTime } from 'luxon'

export interface IUser {
  id: string
  name: string
  lastname: string
  username: string
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

export interface ICode {
  id: string
  code: string
  user_id: string
  createdAt: DateTime
  expires_at: DateTime
}

export enum AccessType {
  ROOT = 0,
  ADMIN = 1,
  BASIC = 2,
  USER = 3,
}

export enum EspecialtyArea {
  PSYCHOLOGIST = 'psychologist',
  SPEECH_THERAPIST = 'speech_therapist',
  NUTRITIONIST = 'nutritionist',
  PHYSIOTHERAPIST = 'physiotherapist',
  DENTIST = 'dentist',
  PHARMACIST = 'pharmacist',
  NURSE = 'nurse',
  OCCUPATIONAL_THERAPIST = 'occupational_therapist',
  CLINIC = 'clinic',
}
