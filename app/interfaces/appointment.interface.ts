export interface IAppointment {
  id: string
  patient_id: string
  professional_id: string
  exam_id?: string
  procedure_id?: string
  schedule_slot_id?: string
  start_time: Date
  end_time: Date
  status: string
  notes?: string
  is_blocked?: boolean
  created_at?: Date
  updated_at?: Date
  deleted_at?: Date
  closed_at?: Date
}
