import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import ExamsService from '#services/exams-services'
import { parsePagination, parsePreloads } from '../utils/crud-query.js'
import { handleHttpError } from '../utils/http-error.js'

const ALLOWED_PRELOADS = ['professionals', 'appointments']

@inject()
export default class ExamsController {
  constructor(private examsService: ExamsService) {}

  async create({ request, response }: HttpContext) {
    try {
      const exam = await this.examsService.create(request.body())
      logger.info({ entity: 'exam', id: exam.id }, 'success.exams.created')
      return response.status(201).json(exam)
    } catch (error) {
      return handleHttpError(response, error, 'exams')
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const exam = await this.examsService.read(request.param('id'), preloads)
      logger.info({ entity: 'exam', id: request.param('id') }, 'success.exams.fetched')
      return response.status(200).json(exam)
    } catch (error) {
      return handleHttpError(response, error, 'exams')
    }
  }

  async list({ request, response }: HttpContext) {
    try {
      const pagination = parsePagination({
        page: request.input('page'),
        limit: request.input('limit'),
      })
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const exams = await this.examsService.list({ ...pagination, preloads })
      logger.info({ entity: 'exam', ...pagination }, 'success.exams.listed')
      return response.status(200).json(exams)
    } catch (error) {
      return handleHttpError(response, error, 'exams')
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const exam = await this.examsService.update(request.param('id'), request.body())
      logger.info({ entity: 'exam', id: request.param('id') }, 'success.exams.updated')
      return response.status(200).json(exam)
    } catch (error) {
      return handleHttpError(response, error, 'exams')
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.examsService.delete(request.param('id'))
      logger.info({ entity: 'exam', id: request.param('id') }, 'success.exams.deleted')
      return response.status(200).json({ message: 'Exam deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error, 'exams')
    }
  }
}
