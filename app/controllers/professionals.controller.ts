import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import ProfessionalsService from '#services/professionals-services'
import { parsePagination, parsePreloads } from '../utils/crud-query.js'
import { handleHttpError } from '../utils/http-error.js'

const ALLOWED_PRELOADS = ['appointments', 'scheduleSlots', 'exams', 'procedures']

@inject()
export default class ProfessionalsController {
  constructor(private professionalsService: ProfessionalsService) {}

  async create({ request, response }: HttpContext) {
    try {
      const professional = await this.professionalsService.create(request.body())
      return response.status(201).json(professional)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const professional = await this.professionalsService.read(request.param('id'), preloads)
      return response.status(200).json(professional)
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
      const professionals = await this.professionalsService.list({ ...pagination, preloads })
      return response.status(200).json(professionals)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const professional = await this.professionalsService.update(request.param('id'), request.body())
      return response.status(200).json(professional)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.professionalsService.delete(request.param('id'))
      return response.status(200).json({ message: 'Professional deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async listExams({ request, response }: HttpContext) {
    try {
      const exams = await this.professionalsService.listExams(request.param('id'))
      return response.status(200).json(exams)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async attachExam({ request, response }: HttpContext) {
    try {
      const exams = await this.professionalsService.attachExam(request.param('id'), request.body())
      return response.status(201).json(exams)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async detachExam({ request, response }: HttpContext) {
    try {
      await this.professionalsService.detachExam(request.param('id'), request.param('examId'))
      return response.status(200).json({ message: 'Exam unlinked successfully' })
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async listProcedures({ request, response }: HttpContext) {
    try {
      const procedures = await this.professionalsService.listProcedures(request.param('id'))
      return response.status(200).json(procedures)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async attachProcedure({ request, response }: HttpContext) {
    try {
      const procedures = await this.professionalsService.attachProcedure(
        request.param('id'),
        request.body()
      )
      return response.status(201).json(procedures)
    } catch (error) {
      return handleHttpError(response, error)
    }
  }

  async detachProcedure({ request, response }: HttpContext) {
    try {
      await this.professionalsService.detachProcedure(request.param('id'), request.param('procedureId'))
      return response.status(200).json({ message: 'Procedure unlinked successfully' })
    } catch (error) {
      return handleHttpError(response, error)
    }
  }
}
