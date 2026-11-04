import type { UUID } from 'node:crypto'
import { DateTime } from 'luxon'

export enum MembershipStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REMOVED = 'removed',
}

export interface IClinic {
  id: UUID
  name: string
  cnpjf?: string | null
  phone?: string | null
  site_page?: string | null
  logo?: string | null
  max_users?: number | null
  sub_expires_at?: DateTime | null
  created_at?: DateTime
  updated_at?: DateTime | null
  deleted_at?: DateTime | null
}

export interface IClinicMembership {
  id: UUID
  clinic_id: UUID
  user_id: UUID
  status: MembershipStatus
  created_at?: DateTime
  updated_at?: DateTime | null
  deleted_at?: DateTime | null
}

export interface IPermission {
  id: UUID
  code: string
  description: string
  created_at?: DateTime
  updated_at?: DateTime | null
}

export interface IRole {
  id: UUID
  clinic_id?: UUID | null
  name: string
  is_system: boolean
  created_at?: DateTime
  updated_at?: DateTime | null
  deleted_at?: DateTime | null
}
