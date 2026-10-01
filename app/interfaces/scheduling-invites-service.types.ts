/** Payload de criação de convite (validado por `createSchedulingInviteValidator`). */
export type CreateInvitePayload = {
  patient_id?: string
  professional_id?: string
  procedure_ids?: string[]
  exam_ids?: string[]
  expires_in_days?: number
}

export type InviteStatus = 'pending' | 'used' | 'expired' | 'revoked'

export type InviteListItem = {
  id: string
  token: string
  url: string
  patient_id: string | null
  professional_id: string | null
  procedure_ids: string[] | null
  exam_ids: string[] | null
  expires_at: string
  used_at: string | null
  created_by: string
  status: InviteStatus
}

export type SchedulingInvitesServiceDeps = {
  inviteModel?: any
  patientModel?: any
  professionalModel?: any
  procedureModel?: any
  examModel?: any
}
