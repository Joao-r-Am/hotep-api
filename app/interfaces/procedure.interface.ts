import { DateTime } from 'luxon'

export interface IProcedure {
  id: string
  clinic_id?: string
  name: string
  description?: string
  duration_minutes?: number
  created_at?: DateTime
  updated_at?: DateTime
  deleted_at?: DateTime
}
