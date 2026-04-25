import { UUID } from 'crypto'
import { DateTime } from 'luxon'

export interface IPatient {
  id: UUID
  name: string
  document: string
  birth_date?: DateTime
  phone?: string
  email?: string
  observations?: string
  created_at?: DateTime
  updated_at?: DateTime
  deleted_at?: DateTime
}
