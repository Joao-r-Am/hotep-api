import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import PatientsService from '#services/patients-services'
import { parsePagination, parsePreloads } from '../utils/crud-query.js'
import { handleHttpError } from '../utils/http-error.js'

const ALLOWED_PRELOADS: string[] = []

@inject()
export default class PatientController {
  constructor(private patientService: PatientsService) {}

  async create({ request, response }: HttpContext) {
    try {
      const patient = await this.patientService.create(request.body())
      logger.info({ entity: 'patient', id: patient.id }, 'success.patients.created')
      return response.status(201).json(patient)
    } catch (error) {
      return handleHttpError(response, error, 'patients')
    }
  }

  async read({ request, response }: HttpContext) {
    try {
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const patient = await this.patientService.read(request.param('id'), preloads)
      logger.info({ entity: 'patient', id: request.param('id') }, 'success.patients.fetched')
      return response.status(200).json(patient)
    } catch (error) {
      return handleHttpError(response, error, 'patients')
    }
  }

  async list({ request, response }: HttpContext) {
    try {
      const pagination = parsePagination({
        page: request.input('page'),
        limit: request.input('limit'),
      })
      const preloads = parsePreloads(request.input('preload'), ALLOWED_PRELOADS)
      const patients = await this.patientService.list({ ...pagination, preloads })

      logger.info({ entity: 'patient', ...pagination }, 'success.patients.listed')
      return response.status(200).json(patients)
    } catch (error) {
      return handleHttpError(response, error, 'patients')
    }
  }

  async update({ request, response }: HttpContext) {
    try {
      const patient = await this.patientService.update(request.param('id'), request.body())
      logger.info({ entity: 'patient', id: request.param('id') }, 'success.patients.updated')
      return response.status(200).json(patient)
    } catch (error) {
      return handleHttpError(response, error, 'patients')
    }
  }

  async delete({ request, response }: HttpContext) {
    try {
      await this.patientService.delete(request.param('id'))
      logger.info({ entity: 'patient', id: request.param('id') }, 'success.patients.deleted')
      return response.status(200).json({ message: 'Patient deleted successfully' })
    } catch (error) {
      return handleHttpError(response, error, 'patients')
    }
  }
}
