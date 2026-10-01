import type { DayAvailability } from '../services/availability-service.js'

/** Dependências injetáveis de `PublicSchedulingService`. */
export type PublicSchedulingServiceDeps = {
  inviteModel?: any
  patientModel?: any
  professionalModel?: any
  procedureModel?: any
  examModel?: any
  userModel?: any
  appointmentModel?: any
  scheduleSlotModel?: any
  idempotencyKeyModel?: any
  availabilityService?: {
    findAvailability(
      params: import('../services/availability-service.js').FindAvailabilityParams
    ): Promise<DayAvailability[]>
  }
  database?: { transaction(): Promise<any> }
}

export type IdentifyResult =
  | { exists: false }
  | {
      exists: true
      patient: { id: string; name_masked: string; birth_date_masked: string | null }
    }

export type RegisterResult = { patient_id: string }

export type ProfessionalDto = {
  id: string
  name: string
  specialty?: string
  registration_number?: string
}

export type ServiceDto = {
  id: string
  name: string
  description?: string
  type?: string
  specialty?: string
  duration_minutes?: number
}

export type SchedulingContextDto = {
  clinic: { id: string; name: string; phone?: string; site_page?: string; logo?: string }
  expires_at: string
  allowed_professionals: string[] | null
  allowed_procedures: string[] | null
  allowed_exams: string[] | null
  patient: { id: string; name_masked: string } | null
  appointment: {
    id: string
    professional_id: string | null
    exam_id: string | null
    procedure_id: string | null
    schedule_slot_id: string | null
    start_time: string | null
    end_time: string | null
    status: string | null
    notes: string | null
    ics_url: string
    cancel_url: string
  } | null
}

export type { DayAvailability }
