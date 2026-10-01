import { DateTime } from 'luxon'

/**
 * Mascara um nome preservando apenas o início do primeiro nome
 * e a inicial do último nome. Ex.: "João da Silva" → "Jo*** S***".
 *
 * Usado para nunca expor o nome completo do paciente em telas públicas.
 */
export function maskName(name: string): string {
  const parts = name.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? ''

  const firstMasked = first.length > 0 ? `${first.slice(0, 2)}***` : '***'
  const lastMasked = last.length > 1 ? `${last.slice(0, 1)}***` : '***'

  if (parts.length === 1) {
    return firstMasked
  }

  return `${firstMasked} ${lastMasked}`
}

/**
 * Mascara uma data de nascimento preservando apenas o ano.
 * Ex.: para 1990-05-20 devolve algo como "??/??/1990".
 */
export function maskBirthDate(value: DateTime | string | Date): string {
  const date =
    value instanceof Date
      ? DateTime.fromJSDate(value)
      : typeof value === 'string'
        ? DateTime.fromISO(value)
        : value

  return `**/**/${date.isValid ? date.year : '????'}`
}
