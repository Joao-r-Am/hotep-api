import { errors } from '@vinejs/vine'
import type { VineValidator } from '@vinejs/vine'
import type { Infer, SchemaTypes } from '@vinejs/vine/types'
import type { HttpContext } from '@adonisjs/core/http'
import { ApiException } from './api-error.js'

/**
 * Valida a requisição com um validator VineJS e converte falhas de
 * validação para `ApiException` (422 `VALIDATION_ERROR`) no formato
 * padronizado do Medkit, mantendo as mensagens de campo em `details`.
 */
export async function validateOrThrow<Schema extends SchemaTypes>(
  request: HttpContext['request'],
  validator: VineValidator<Schema, Record<string, any> | undefined>
): Promise<Infer<Schema>> {
  try {
    return await request.validateUsing(validator)
  } catch (error) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      throw new ApiException(422, 'VALIDATION_ERROR', 'Dados inválidos.', {
        messages: error.messages,
      })
    }
    throw error
  }
}
