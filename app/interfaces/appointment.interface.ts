import { DateTime } from 'luxon'

export interface IAppointment {
  id: string
  patient_id: string
  professional_id: string
  exam_id?: string | null
  procedure_id?: string | null
  schedule_slot_id?: string | null
  start_time: DateTime
  end_time: DateTime
  status: string
  notes?: string | null
  is_blocked?: boolean
  created_at?: DateTime
  updated_at?: DateTime | null
  deleted_at?: DateTime | null
  closed_at?: DateTime | null
}
