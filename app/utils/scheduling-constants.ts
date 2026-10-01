/**
 * Constantes de estado de agendamento.
 *
 * Atenção: o legado grava `appointments.status` tanto em maiúsculas
 * (SCHEDULED/CONFIRMED/CANCELLED — frontend atual) quanto em minúsculas.
 * Por isso os conjuntos abaixo contemplam os dois cases. O novo código
 * (auto-agendamento) escreve apenas UpperCamelCase.
 */

export const APPOINTMENT_STATUS_CONFIRMED = 'CONFIRMED'
export const APPOINTMENT_STATUS_CANCELLED = 'CANCELLED'
export const APPOINTMENT_STATUS_COMPLETED = 'COMPLETED'

/**
 * Status que liberam o slot para nova reserva (não são considerados ativos).
 */
export const APPOINTMENT_INACTIVE_STATUSES = [
  'cancelled',
  'no_show',
  'CANCELLED',
  'NO_SHOW',
  'COMPLETED',
]

/**
 * Status de `schedule_slots` que tornam o slot indisponível.
 * O padrão do banco é `AVAILABLE`.
 */
export const SCHEDULE_SLOT_BLOCKED_STATUSES = ['BLOCKED', 'OCCUPIED']
export const SCHEDULE_SLOT_STATUS_AVAILABLE = 'AVAILABLE'

/**
 * Prefixo dos endpoints públicos de auto-agendamento.
 */
export const PUBLIC_SCHEDULING_PREFIX = '/api/v1/public/scheduling'

/** Janela máxima do `GET /availability` (em dias). */
export const AVAILABILITY_MAX_WINDOW_DAYS = 60

/** Escopo usado pela tabela `idempotency_keys` na criação de agendamento. */
export const IDEMPOTENCY_SCOPE_APPOINTMENT = 'public.scheduling.appointment'

/** Janela de validade das chaves de idempotência (em horas). */
export const IDEMPOTENCY_WINDOW_HOURS = 24

/** Padrão de cancelamento: mínimo de horas de antecedência (configurável via env). */
export const DEFAULT_CANCEL_WINDOW_HOURS = 24
