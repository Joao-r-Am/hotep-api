import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
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
      return response.status(201).json(appointment)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const appointment = await this.appointmentsService.read(request.param('id'), preloads)
      return response.status(200).json(appointment)
    } catch (error) {
      return handleHttpError(response, error)
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
      return response.status(200).json(appointments)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const appointment = await this.appointmentsService.update(request.param('id'), request.body())
      return response.status(200).json(appointment)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.appointmentsService.delete(request.param('id'))
      return response.status(200).json({ message: 'Appointment deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error)
    }
  }
}
