import { DateTime } from 'luxon'

export type IcsEvent = {
  uid: string
  start: DateTime
  end: DateTime
  summary: string
  description?: string
  location?: string
}

/**
 * Escapa valores de texto para o formato iCalendar (RFC 5545):
 * barra invertida, ponto-e-vírgula, vírgula e quebras de linha.
 */
function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

const CRLF = '\r\n'

/**
 * Gera um arquivo `.ics` (RFC 5545) para o paciente adicionar ao calendário.
 *
 * As datas são serializadas em UTC com sufixo `Z`, já que o backend
 * armazena tudo em UTC. O nome do arquivo sugerido fica
 * `agendamento-<uid>.ics`.
 */
export function buildIcs(event: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Medkit//Agendamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(event.uid)}`,
    `DTSTAMP:${DateTime.now().toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'")}`,
    `DTSTART:${event.start.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'")}`,
    `DTEND:${event.end.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'")}`,
    `SUMMARY:${escapeIcs(event.summary)}`,
  ]

  if (event.location) {
    lines.push(`LOCATION:${escapeIcs(event.location)}`)
  }

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcs(event.description)}`)
  }

  lines.push('END:VEVENT', 'END:VCALENDAR')

  return lines.join(CRLF) + CRLF
}
