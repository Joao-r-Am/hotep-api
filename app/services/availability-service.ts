import { DateTime } from 'luxon'
import ScheduleSlot from '#models/ScheduleSlotModel'
import Appointment from '#models/AppointmentModel'
import {
  APPOINTMENT_INACTIVE_STATUSES,
  AVAILABILITY_MAX_WINDOW_DAYS,
  SCHEDULE_SLOT_BLOCKED_STATUSES,
} from '../utils/scheduling-constants.js'

export type DayAvailability = {
  date: string
  slots: {
    schedule_slot_id: string
    start_time: string
    end_time: string
  }[]
}

export type FindAvailabilityParams = {
  professionalId: string
  /**
   * Duração mínima do procedimento em minutos. `null` = sem filtro de
   * duração (default: o slot inteiro é ocupado pelo agendamento).
   */
  procedureDurationMinutes: number | null
  from: Date
  to: Date
  /** TZ da clínica, ex.: `America/Sao_Paulo` — usada só para agrupar por dia. */
  timezone: string
}

export type AvailabilityServiceDeps = {
  scheduleSlotModel?: any
  appointmentModel?: any
}

type SlotCandidate = {
  id: string
  start_time: string | Date | DateTime
  end_time: string | Date | DateTime
  status: string
}

type ActiveAppointment = {
  schedule_slot_id: string | null
  status: string
  deleted_at: string | Date | null
}

/**
 * Normaliza um horário para UTC. Valores podem vir como string ISO,
 * `Date` do driver pg ou `DateTime` do Lucid.
 */
export function toUtcDateTime(value: string | Date | DateTime): DateTime {
  if (value instanceof DateTime) return value.toUTC()
  if (value instanceof Date) return DateTime.fromJSDate(value).toUTC()
  return DateTime.fromISO(value, { setZone: true }).toUTC()
}

/**
 * Função pura que reduz a lista de slots + agendamentos ativos a uma
 * disponibilidade por dia, no fuso da clínica.
 *
 * Regras:
 * - Exclui slots bloqueados (`status in BLOCKED/OCCUPIED`).
 * - Exclui slots com agendamento ativo (não cancelado/no_show/completed).
 * - Exclui slots com duração menor que a do procedimento (quando informada).
 * - Agrupa por dia no `timezone` da clínica; horários devolvidos em ISO UTC (Z).
 */
export function computeDayAvailability(
  slots: SlotCandidate[],
  activeAppointments: ActiveAppointment[],
  procedureDurationMinutes: number | null,
  timezone: string
): DayAvailability[] {
  const occupiedSlotIds = new Set(
    activeAppointments
      .filter((appointment) => !APPOINTMENT_INACTIVE_STATUSES.includes(appointment.status))
      .filter((appointment) => Boolean(appointment.schedule_slot_id))
      .map((appointment) => appointment.schedule_slot_id as string)
  )

  const normalizedSlots = slots
    .filter((slot) => !SCHEDULE_SLOT_BLOCKED_STATUSES.includes(slot.status.toUpperCase()))
    .filter((slot) => !occupiedSlotIds.has(slot.id))
    .filter((slot) => {
      if (procedureDurationMinutes === null) return true
      const durationMinutes = toUtcDateTime(slot.end_time).diff(
        toUtcDateTime(slot.start_time),
        'minutes'
      ).minutes
      return durationMinutes >= procedureDurationMinutes
    })
    .map((slot) => ({
      id: slot.id,
      start: toUtcDateTime(slot.start_time),
      end: toUtcDateTime(slot.end_time),
    }))
    .sort((a, b) => a.start.toMillis() - b.start.toMillis())

  const days = new Map<string, DayAvailability>()

  for (const slot of normalizedSlots) {
    const date = slot.start.setZone(timezone).toFormat('yyyy-MM-dd')

    const day = days.get(date) ?? { date, slots: [] }
    day.slots.push({
      schedule_slot_id: slot.id,
      start_time: slot.start.toISO()!,
      end_time: slot.end.toISO()!,
    })
    days.set(date, day)
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Calcula a disponibilidade de um profissional em um intervalo.
 *
 * `from`/`to` são limitados a `AVAILABILITY_MAX_WINDOW_DAYS` (60 dias):
 * se o intervalo for maior, `to` é recuado (defesa contra abuso e
 * consultas pesadas).
 */
export default class AvailabilityService {
  constructor(private readonly deps: AvailabilityServiceDeps = {}) {}

  async findAvailability(params: FindAvailabilityParams): Promise<DayAvailability[]> {
    const { professionalId, procedureDurationMinutes, from, to, timezone } = params

    if (to.getTime() < from.getTime()) {
      return []
    }

    const fromDate = DateTime.fromJSDate(from).toUTC()
    const maxToDate = fromDate.plus({ days: AVAILABILITY_MAX_WINDOW_DAYS })
    const toDate = DateTime.fromJSDate(to).toUTC()
    const effectiveToDate = toDate.toMillis() > maxToDate.toMillis() ? maxToDate : toDate

    const scheduleSlotModel = this.deps.scheduleSlotModel ?? ScheduleSlot
    const appointmentModel = this.deps.appointmentModel ?? Appointment

    const slots = (await scheduleSlotModel
      .query()
      .where('professional_id', professionalId)
      .where('start_time', '>=', fromDate.toISO()!)
      .where('start_time', '<=', effectiveToDate.toISO()!)
      .whereNotIn('status', SCHEDULE_SLOT_BLOCKED_STATUSES)) as SlotCandidate[]

    let activeAppointments: ActiveAppointment[] = []
    const slotIds = slots.map((slot) => slot.id)

    if (slotIds.length > 0) {
      activeAppointments = (await appointmentModel
        .query()
        .whereIn('schedule_slot_id', slotIds)
        .whereNull('deleted_at')
        .whereNotIn('status', APPOINTMENT_INACTIVE_STATUSES)) as ActiveAppointment[]
    }

    return computeDayAvailability(slots, activeAppointments, procedureDurationMinutes, timezone)
  }
}
