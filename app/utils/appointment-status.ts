/**
 * Rótulos de status de agendamento em pt-BR.
 *
 * O banco mistura convenções de escrita: o auto-agendamento grava
 * UpperCamelCase (`CONFIRMED`, `CANCELLED`, `COMPLETED`) e o legado grava
 * minúsculas (`cancelled`, `no_show`). A busca é normalizada para maiúsculas,
 * então as duas formas caem no mesmo rótulo.
 */

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Não compareceu',
  BLOCKED: 'Bloqueado',
}

/**
 * Traduz o status para pt-BR. Status desconhecido volta cru, para não
 * esconder informação nova que ainda não tenha rótulo definido.
 */
export function appointmentStatusLabel(status: string): string {
  return STATUS_LABELS[status.trim().toUpperCase()] ?? status
}
