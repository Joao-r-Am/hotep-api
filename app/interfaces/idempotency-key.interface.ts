import { DateTime } from 'luxon'

/**
 * Chave de idempotência: garante replay idempotente de requisições sensíveis
 * (ex.: criação de appointment público) dentro de uma janela de 24 horas.
 *
 * Campos:
 * - `key`: valor do header `Idempotency-Key`.
 * - `scope`: contexto da operação (ex.: `public.scheduling.appointment`) para
 *   permitir a mesma chave em operações distintas sem colisão semântica.
 * - `status_code`/`response`: resposta original serializada, devolvida em replays.
 * - `created_at`: usado para descartar registros mais velhos que a janela (24h).
 */
export interface IIdempotencyKey {
  id: string
  key: string
  scope: string
  status_code: number
  response: Record<string, unknown>
  created_at?: DateTime
}
