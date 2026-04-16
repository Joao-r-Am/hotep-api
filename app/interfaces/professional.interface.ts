import { DateTime } from 'luxon'

export interface IProfessional {
  id: string
  name: string
  document: string
  birth_date?: DateTime
  specialty?: string
  registration_number?: string
  phone?: string
  email?: string
  created_at?: DateTime
  updated_at?: DateTime
  deleted_at?: DateTime
}
