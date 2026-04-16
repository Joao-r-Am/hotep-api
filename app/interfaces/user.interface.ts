export interface IUser {
  id: string
  name: string
  cnpjf: string
  password: string
  email: string
  phone: string
  site_page?: string
  birthday?: Date
  access_type?: number
  especialty_area?: string
  roles?: string[]
  logo?: string
  max_users?: number
  sub_expires_at?: Date
  active?: boolean
  deleted_at?: Date
  created_at: Date
  updated_at?: Date
}
