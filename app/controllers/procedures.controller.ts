import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import ProceduresService from '#services/procedures-services'
import { parsePagination, parsePreloads } from '../utils/crud-query.js'
import { handleHttpError } from '../utils/http-error.js'

const ALLOWED_PRELOADS = ['professionals', 'appointments']

@inject()
export default class ProceduresController {
  constructor(private proceduresService: ProceduresService) {}

  async create({ request, response }: HttpContext) {
    try {
      const procedure = await this.proceduresService.create(request.body())
      logger.info({ entity: 'procedure', id: procedure.id }, 'success.procedures.created')
      return response.status(201).json(procedure)
    } catch (error) {
      return handleHttpError(response, error, 'procedures')
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const procedure = await this.proceduresService.read(request.param('id'), preloads)
      logger.info({ entity: 'procedure', id: request.param('id') }, 'success.procedures.fetched')
      return response.status(200).json(procedure)
    } catch (error) {
      return handleHttpError(response, error, 'procedures')
    }
  }

  async list({ request, response }: HttpContext) {
    try {
      const pagination = parsePagination({
        page: request.input('page'),
        limit: request.input('limit'),
      })
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const procedures = await this.proceduresService.list({ ...pagination, preloads })
      logger.info({ entity: 'procedure', ...pagination }, 'success.procedures.listed')
      return response.status(200).json(procedures)
    } catch (error) {
      return handleHttpError(response, error, 'procedures')
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const procedure = await this.proceduresService.update(request.param('id'), request.body())
      logger.info({ entity: 'procedure', id: request.param('id') }, 'success.procedures.updated')
      return response.status(200).json(procedure)
    } catch (error) {
      return handleHttpError(response, error, 'procedures')
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.proceduresService.delete(request.param('id'))
      logger.info({ entity: 'procedure', id: request.param('id') }, 'success.procedures.deleted')
      return response.status(200).json({ message: 'Procedure deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error, 'procedures')
    }
  }
}
