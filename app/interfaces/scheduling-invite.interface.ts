import { DateTime } from 'luxon'

/**
 * Convite de auto-agendamento por link único.
 *
 * Campos:
 * - `token`: identificador CSPRNG (32 chars, base64url) usado como credencial do link público.
 * - `clinic_id`: a "clínica" no Medkit é a entidade `users` (usuário raiz com `cnpjf`).
 * - `patient_id`/`professional_id`: vínculos pré-selecionados pelo operador (opcionais).
 *   Se `professional_id` vier preenchido, o link só libera aquele profissional.
 * - `procedure_ids`/`exam_ids`: whitelist opcional de procedimentos/exames permitidos.
 *   Nulos significam "todos os disponíveis para o profissional".
 * - `expires_at`: momento de expiração do link (UTC). Após expirar, o link retorna 410 `TOKEN_EXPIRED`.
 * - `used_at`: preenchido quando o paciente conclui o 1º agendamento pelo link (410 `TOKEN_USED`).
 * - `created_by`: operador (usuário autenticado) que gerou o convite.
 * - `deleted_at`: soft delete usado para revogar o convite.
 */
export interface ISchedulingInvite {
  id: string
  token: string
  clinic_id: string
  patient_id?: string | null
  professional_id?: string | null
  procedure_ids?: string[] | null
  exam_ids?: string[] | null
  expires_at: DateTime
  used_at?: DateTime | null
  created_by: string
  deleted_at?: DateTime | null
  created_at?: DateTime
  updated_at?: DateTime | null
}
