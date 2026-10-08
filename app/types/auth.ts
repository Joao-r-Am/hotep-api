/**
 * Extensão de tipos para o contexto HTTP com autenticação
 */

import type { JwtPayload } from 'jsonwebtoken'
import type { AccessType, EspecialtyArea } from '../interfaces/users.inteface.js'

export interface IAuthPayload extends JwtPayload {
  email: string
  user_id: string
  name: string
  cnpjf: string
  especialty_area: EspecialtyArea
  access_type: AccessType
}

export interface IAuthContext {
  user: IAuthPayload
  is_authenticated: boolean
}

declare module '@adonisjs/core/http' {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- o nome da interface é definido pelo Adonis
  interface HttpContext {
    auth?: IAuthContext
  }
}
