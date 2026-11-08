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
  clinic_id?: string
  membership_id?: string
}

export interface IAuthContext {
  user: IAuthPayload
  /** Claims do token bruto, como recebidas na assinatura (fonte para o access_context). */
  payload?: IAuthPayload
  is_authenticated: boolean
}

/**
 * Contexto de acesso tenant, montado a cada requisição pelo
 * middleware `access_context` a partir do vínculo validado no banco.
 *
 * Papéis e permissões aqui NÃO são verdade absoluta do token:
 * são resolvidos do banco em cada request.
 */
export interface IAccessContext {
  userId: string
  clinicId: string
  membershipId: string
  roles: { id: string; name: string }[]
  permissions: string[]
}

declare module '@adonisjs/core/http' {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- o nome da interface é definido pelo Adonis
  interface HttpContext {
    auth?: IAuthContext
    accessContext?: IAccessContext
  }
}
