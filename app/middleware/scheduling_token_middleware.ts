import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import SchedulingInvite from '#models/SchedulingInviteModel'
import RateLimitService, { RATE_LIMIT_GENERAL } from '#services/rate-limit-service'
import { ApiException } from '../utils/api-error.js'

/**
 * Middleware `validateSchedulingToken`.
 *
 * Executa em todas as rotas de `/public/scheduling/:token/*`:
 * - Busca o convite pelo token (ignorando revogações).
 * - `404 TOKEN_INVALID` quando não existe.
 * - `410 TOKEN_USED` quando `used_at` já foi preenchido.
 * - `410 TOKEN_EXPIRED` quando `expires_at` já passou.
 * - Rate limit de 30 req/min por (token + IP).
 * - Anexa o convite em `ctx.schedulingInvite` para os handlers.
 */
@inject()
export default class ValidateSchedulingToken {
  constructor(private readonly rateLimit: RateLimitService) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const token = ctx.request.param('token') as string | undefined

    if (!token) {
      throw new ApiException(404, 'TOKEN_INVALID', 'Link inválido.', {})
    }

    const invite = await SchedulingInvite.query()
      .where('token', token)
      .whereNull('deleted_at')
      .first()

    if (!invite) {
      throw new ApiException(404, 'TOKEN_INVALID', 'Link inválido.', {})
    }

    const path = ctx.request.url()
    const isBookingRoute = path.endsWith('/appointments') && ctx.request.method() === 'POST'

    if (invite.used_at && isBookingRoute) {
      throw new ApiException(410, 'TOKEN_USED', 'Este link já foi utilizado.', {})
    }

    if (invite.expires_at.toMillis() < DateTime.now().toMillis()) {
      throw new ApiException(410, 'TOKEN_EXPIRED', 'Este link expirou.', {})
    }

    const key = `public:scheduling:${token}:${ctx.request.ip()}`
    await this.rateLimit.assertAllowed(key, RATE_LIMIT_GENERAL)

    ctx.schedulingInvite = invite

    return next()
  }
}
