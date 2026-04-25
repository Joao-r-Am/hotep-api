import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
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
      return response.status(201).json(exam)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const exam = await this.examsService.read(request.param('id'), preloads)
      return response.status(200).json(exam)
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
      const exams = await this.examsService.list({ ...pagination, preloads })
      return response.status(200).json(exams)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const exam = await this.examsService.update(request.param('id'), request.body())
      return response.status(200).json(exam)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.examsService.delete(request.param('id'))
      return response.status(200).json({ message: 'Exam deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error)
    }
  }
}
