import type { HttpContext } from '@adonisjs/core/http'
import { ApiException } from './api-error.js'

/**
 * Checagem central de permissões para actions tenant.
 *
 * Deve ser chamada nos controllers (ou serviços) após o middleware
 * `access_context`, que popula `ctx.accessContext` com as permissões
 * resolvidas em banco.
 */
export function requirePermission(ctx: HttpContext, code: string): void {
  const access = ctx.accessContext

  if (!access) {
    throw new ApiException(
      403,
      'CLINIC_CONTEXT_REQUIRED',
      'Usuário sem clínica ativa. Selecione ou crie uma clínica antes de acessar este recurso.',
      {}
    )
  }

  if (!access.permissions.includes(code)) {
    throw new ApiException(403, 'MISSING_PERMISSION', 'Usuário sem permissão para esta ação.', {
      permission: code,
    })
  }
}
