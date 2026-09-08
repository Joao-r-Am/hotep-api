import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
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
      logger.info({ entity: 'professional', id: professional.id }, 'success.professionals.created')
      return response.status(201).json(professional)
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const professional = await this.professionalsService.read(request.param('id'), preloads)
      logger.info(
        { entity: 'professional', id: request.param('id') },
        'success.professionals.fetched'
      )
      return response.status(200).json(professional)
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
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
      logger.info({ entity: 'professional', ...pagination }, 'success.professionals.listed')
      return response.status(200).json(professionals)
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const professional = await this.professionalsService.update(
        request.param('id'),
        request.body()
      )
      logger.info(
        { entity: 'professional', id: request.param('id') },
        'success.professionals.updated'
      )
      return response.status(200).json(professional)
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.professionalsService.delete(request.param('id'))
      logger.info(
        { entity: 'professional', id: request.param('id') },
        'success.professionals.deleted'
      )
      return response.status(200).json({ message: 'Professional deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async listExams({ request, response }: HttpContext) {
    try {
      const exams = await this.professionalsService.listExams(request.param('id'))
      logger.info(
        { entity: 'professional', id: request.param('id'), related: 'exams' },
        'success.professionals.exams_listed'
      )
      return response.status(200).json(exams)
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async attachExam({ request, response }: HttpContext) {
    try {
      const exams = await this.professionalsService.attachExam(request.param('id'), request.body())
      logger.info(
        { entity: 'professional', id: request.param('id'), related: 'exam' },
        'success.professionals.exam_attached'
      )
      return response.status(201).json(exams)
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async detachExam({ request, response }: HttpContext) {
    try {
      await this.professionalsService.detachExam(request.param('id'), request.param('examId'))
      logger.info(
        { entity: 'professional', id: request.param('id'), exam_id: request.param('examId') },
        'success.professionals.exam_detached'
      )
      return response.status(200).json({ message: 'Exam unlinked successfully' })
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async listProcedures({ request, response }: HttpContext) {
    try {
      const procedures = await this.professionalsService.listProcedures(request.param('id'))
      logger.info(
        { entity: 'professional', id: request.param('id'), related: 'procedures' },
        'success.professionals.procedures_listed'
      )
      return response.status(200).json(procedures)
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async attachProcedure({ request, response }: HttpContext) {
    try {
      const procedures = await this.professionalsService.attachProcedure(
        request.param('id'),
        request.body()
      )
      logger.info(
        { entity: 'professional', id: request.param('id'), related: 'procedure' },
        'success.professionals.procedure_attached'
      )
      return response.status(201).json(procedures)
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }

  async detachProcedure({ request, response }: HttpContext) {
    try {
      await this.professionalsService.detachProcedure(
        request.param('id'),
        request.param('procedureId')
      )
      logger.info(
        {
          entity: 'professional',
          id: request.param('id'),
          procedure_id: request.param('procedureId'),
        },
        'success.professionals.procedure_detached'
      )
      return response.status(200).json({ message: 'Procedure unlinked successfully' })
    } catch (error) {
      return handleHttpError(response, error, 'professionals')
    }
  }
}
