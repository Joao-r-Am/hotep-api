/**
 * Extensão de tipos para o contexto HTTP com autenticação
 */

import { JwtPayload } from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      auth?: {
        user: JwtPayload & {
          email: string
          user_id: string
          name: string
          cnpjf: string
          especialty_area: string
          access_type: string
        }
        isAuthenticated: boolean
      }
    }
  }
}

export interface AuthPayload extends JwtPayload {
  email: string
  user_id: string
  name: string
  cnpjf: string
  especialty_area: string
  access_type: string
}

export interface AuthContext {
  user: AuthPayload
  isAuthenticated: boolean
}
