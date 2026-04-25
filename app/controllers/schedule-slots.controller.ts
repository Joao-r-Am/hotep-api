import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ScheduleSlotsService from '#services/schedule-slots-services'
import { parsePagination, parsePreloads } from '../utils/crud-query.js'
import { handleHttpError } from '../utils/http-error.js'

const ALLOWED_PRELOADS = ['professional', 'appointments']

@inject()
export default class ScheduleSlotsController {
  constructor(private scheduleSlotsService: ScheduleSlotsService) {}

  async create({ request, response }: HttpContext) {
    try {
      const scheduleSlot = await this.scheduleSlotsService.create(request.body())
      return response.status(201).json(scheduleSlot)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const scheduleSlot = await this.scheduleSlotsService.read(request.param('id'), preloads)
      return response.status(200).json(scheduleSlot)
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
      const scheduleSlots = await this.scheduleSlotsService.list({ ...pagination, preloads })
      return response.status(200).json(scheduleSlots)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const scheduleSlot = await this.scheduleSlotsService.update(request.param('id'), request.body())
      return response.status(200).json(scheduleSlot)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.scheduleSlotsService.delete(request.param('id'))
      return response.status(200).json({ message: 'Schedule slot deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error)
    }
  }
}
