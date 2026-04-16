import { DateTime } from 'luxon'

export interface IScheduleSlot {
  id: string
  professional_id: string
  start_time: DateTime
  end_time: DateTime
  status: string
  notes?: string
  created_at?: DateTime
  updated_at?: DateTime
}
