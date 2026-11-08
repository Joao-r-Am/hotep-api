import logger from '@adonisjs/core/services/logger'
import type { HttpContext } from '@adonisjs/core/http'

export type ApiErrorDetails = Record<string, unknown>

/**
 * Exceção de domínio padronizada do Medkit.
 *
 * Todas as respostas de erro das novas rotas seguem o formato
 * `{ code, message, details }`, com o HTTP status correspondente.
 */
export class ApiException extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: ApiErrorDetails = {}
  ) {
    super(message)
    this.name = 'ApiException'
  }
}

function toHttpResponse(response: HttpContext['response'], status: number, body: unknown) {
  return response.status(status).json(body)
}

/**
 * Converte qualquer erro em uma resposta padronizada.
 *
 * - `ApiException` → mantém status/code/message/details.
 * - Erros desconhecidos → 500 `INTERNAL_ERROR` (sem vazar detalhes internos).
 */
export function sendErrorResponse(ctx: HttpContext, error: unknown) {
  const responseCtx = ctx.response
  const requestPath = ctx.request.url()

  if (error instanceof ApiException) {
    return toHttpResponse(responseCtx, error.status, {
      code: error.code,
      message: error.message,
      details: error.details,
    })
  }

  // Erros de validação (VineJS): 422 com as mensagens por campo.
  if (error instanceof Error && 'messages' in error) {
    logger.debug({ err: error, path: requestPath }, 'error.validation')
    return toHttpResponse(responseCtx, 422, {
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos.',
      details: { messages: (error as unknown as { messages: unknown }).messages },
    })
  }

  logger.error({ err: error, path: requestPath }, 'error.unhandled')

  return toHttpResponse(responseCtx, 500, {
    code: 'INTERNAL_ERROR',
    message: 'Erro interno no servidor.',
    details: {},
  })
}
