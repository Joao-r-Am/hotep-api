type HttpResponse = {
  status(code: number): HttpResponse
  json(payload: unknown): unknown
}

export function handleHttpError(response: HttpResponse, error: any) {
  const status = error?.status ?? 500
  const payload = error?.message ?? error?.messages ?? 'Internal server error'

  return response.status(status).json(payload)
}
