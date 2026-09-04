import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import AppointmentsService from '#services/appointments-services'
import { parsePagination, parsePreloads } from '../utils/crud-query.js'
import { handleHttpError } from '../utils/http-error.js'

const ALLOWED_PRELOADS = ['patient', 'professional', 'exam', 'procedure', 'scheduleSlot']

@inject()
export default class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  async create({ request, response }: HttpContext) {
    try {
      const appointment = await this.appointmentsService.create(request.body())
      logger.info({ entity: 'appointment', id: appointment.id }, 'success.appointments.created')
      return response.status(201).json(appointment)
    } catch (error) {
      return handleHttpError(response, error, 'appointments')
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const appointment = await this.appointmentsService.read(request.param('id'), preloads)
      logger.info(
        { entity: 'appointment', id: request.param('id') },
        'success.appointments.fetched'
      )
      return response.status(200).json(appointment)
    } catch (error) {
      return handleHttpError(response, error, 'appointments')
    }
  }

  async list({ request, response }: HttpContext) {
    try {
      const pagination = parsePagination({
        page: request.input('page'),
        limit: request.input('limit'),
      })
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const appointments = await this.appointmentsService.list({ ...pagination, preloads })
      logger.info({ entity: 'appointment', ...pagination }, 'success.appointments.listed')
      return response.status(200).json(appointments)
    } catch (error) {
      return handleHttpError(response, error, 'appointments')
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const appointment = await this.appointmentsService.update(request.param('id'), request.body())
      logger.info(
        { entity: 'appointment', id: request.param('id') },
        'success.appointments.updated'
      )
      return response.status(200).json(appointment)
    } catch (error) {
      return handleHttpError(response, error, 'appointments')
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.appointmentsService.delete(request.param('id'))
      logger.info(
        { entity: 'appointment', id: request.param('id') },
        'success.appointments.deleted'
      )
      return response.status(200).json({ message: 'Appointment deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error, 'appointments')
    }
  }
}
