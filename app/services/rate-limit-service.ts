import limiter from '@adonisjs/limiter/services/main'
import type { LimiterConsumptionOptions } from '@adonisjs/limiter/types'
import { ApiException } from '../utils/api-error.js'

export type RateLimiterLike = {
  isBlocked(key: string | number): Promise<boolean>
  increment(key: string | number): Promise<{ consumed: number }>
  block(key: string | number, duration: string | number): Promise<unknown>
}

export type RateLimitServiceDeps = {
  limiter?: RateLimiterLike
}

const GENERAL_OPTIONS: LimiterConsumptionOptions = {
  requests: 30,
  duration: '1 min',
  blockDuration: '1 min',
}

export const RATE_LIMIT_GENERAL = 30
export const RATE_LIMIT_IDENTIFY = 10

const BLOCK_DURATION = '1 min'

/**
 * Rate limiting por bucket manual (IP + token).
 *
 * Usa o `@adonisjs/limiter` do projeto (store `memory` em dev) com o mesmo
 * padrão já presente em `users-services` (`isBlocked`/`increment`/`block`).
 * Para produção, trocar a store para `redis` em `config/limiter.ts`.
 */
export default class RateLimitService {
  private readonly limiter: RateLimiterLike

  constructor(deps: RateLimitServiceDeps = {}) {
    this.limiter = deps.limiter ?? limiter.use(GENERAL_OPTIONS)
  }

  /**
   * Consome 1 tentativa do bucket `key`. Lança `429 RATE_LIMITED` quando
   * o bucket está bloqueado ou estoura o limite.
   */
  async assertAllowed(
    key: string,
    maxFailures: number,
    blockDuration: string | number = BLOCK_DURATION
  ): Promise<void> {
    if (await this.limiter.isBlocked(key)) {
      throw this.tooManyRequests()
    }

    const { consumed } = await this.limiter.increment(key)

    if (consumed >= maxFailures) {
      await this.limiter.block(key, blockDuration)
      throw this.tooManyRequests()
    }
  }

  private tooManyRequests(): ApiException {
    return new ApiException(
      429,
      'RATE_LIMITED',
      'Muitas requisições. Tente novamente em instantes.',
      { retryAfterSeconds: 60 }
    )
  }
}
