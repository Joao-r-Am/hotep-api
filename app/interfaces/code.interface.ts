import { DateTime } from 'luxon'

export interface ICode {
  id: string
  code: string
  user_id: string
  created_at: DateTime
  expires_at: DateTime
}
