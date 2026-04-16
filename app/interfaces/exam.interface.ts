import { DateTime } from 'luxon'

export interface IExam {
  id: string
  code?: string
  name: string
  type?: string
  specialty?: string
  description?: string
  preparation_instructions?: string
  duration_minutes?: number
  tags?: string[]
  created_at?: DateTime
  updated_at?: DateTime
  deleted_at?: DateTime
}
