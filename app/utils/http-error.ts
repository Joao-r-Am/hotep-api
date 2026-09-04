import logger from '@adonisjs/core/services/logger'

type HttpResponse = {
  status(code: number): HttpResponse
  json(payload: unknown): unknown
}

const ERROR_KEYS: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_failed',
  429: 'too_many_requests',
}

export function handleHttpError(response: HttpResponse, error: any, serviceName?: string) {
  const status = error?.status ?? 500
  const payload = error?.message ?? error?.messages ?? 'Internal server error'
  const errorKey = ERROR_KEYS[status] ?? 'internal_error'
  const message = `error.${serviceName ?? 'api'}.${errorKey}`

  if (status >= 500) {
    logger.error({ err: error, status }, message)
  } else {
    logger.warn({ status, message: payload }, message)
  }

  return response.status(status).json(payload)
}
