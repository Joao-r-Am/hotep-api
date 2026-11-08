import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ClinicsService from '#services/clinics-services'
import ReceitawsService from '#services/receitaws-service'
import logger from '@adonisjs/core/services/logger'
import { requirePermission } from '../utils/access_context.js'
import { ApiException, sendErrorResponse } from '../utils/api-error.js'

@inject()
export default class ClinicsController {
  constructor(
    private readonly clinicsService: ClinicsService,
    private readonly receitawsService: ReceitawsService,
  ) {}

  private requireUser(ctx: HttpContext) {
    const user = ctx.auth?.user
    if (!user) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Usuário não autenticado.', {})
    }
    return user
  }

  /**
   * Conta-nível: consulta o CNPJ na Receitaws para preencher o form de
   * criação da clínica (sem exigir clínica ativa).
   */
  async lookupCnpj(ctx: HttpContext) {
    try {
      this.requireUser(ctx)
      const result = await this.receitawsService.lookup(String(ctx.request.param('cnpj')))
      return ctx.response.status(200).json(result)
    } catch (error) {
      logger.warn({ path: ctx.request.url() }, 'error.clinics.cnpj_lookup')
      return sendErrorResponse(ctx, error)
    }
  }

  /**
   * Conta-nível: consulta o CNPJ no banco local. Se a clínica já existe
   * no Medkit, o frontend oferece "vincular-se" em vez de criar.
   */
  async findByCnpj(ctx: HttpContext) {
    try {
      this.requireUser(ctx)
      const result = await this.clinicsService.findLocalByCnpj(String(ctx.request.param('cnpj')))
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  /**
   * Conta-nível: vincula o usuário logado (member `active` + role operator)
   * a uma clínica existente, sem exigir clínica ativa no token.
   */
  async link(ctx: HttpContext) {
    try {
      const user = this.requireUser(ctx)
      const clinicId = String(ctx.request.param('id'))
      const result = await this.clinicsService.linkUser(clinicId, user.user_id)
      logger.info(
        { user_id: user.user_id, clinic_id: result?.clinic?.id },
        'success.clinics.linked'
      )
      return ctx.response.status(201).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async myClinics(ctx: HttpContext) {
    try {
      const user = this.requireUser(ctx)
      const result = await this.clinicsService.listMyClinics(user.user_id)
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async create(ctx: HttpContext) {
    try {
      const user = this.requireUser(ctx)
      const result = await this.clinicsService.createClinic(user.user_id, ctx.request.body())
      logger.info(
        { user_id: user.user_id, clinic_id: result?.clinic?.id },
        'success.clinics.created'
      )
      return ctx.response.status(201).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async read(ctx: HttpContext) {
    try {
      const user = this.requireUser(ctx)
      const clinicId = String(ctx.request.param('id'))
      const result = await this.clinicsService.readClinic(clinicId, user.user_id)
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async members(ctx: HttpContext) {
    try {
      requirePermission(ctx, 'team.read')
      const user = this.requireUser(ctx)
      const clinicId = String(ctx.request.param('id'))
      const result = await this.clinicsService.listMembers(clinicId, user.user_id)
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async roles(ctx: HttpContext) {
    try {
      requirePermission(ctx, 'roles.read')
      const user = this.requireUser(ctx)
      const clinicId = String(ctx.request.param('id'))
      const result = await this.clinicsService.listRoles(clinicId, user.user_id)
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async permissions(ctx: HttpContext) {
    try {
      this.requireUser(ctx)
      const result = await this.clinicsService.listPermissions()
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }
}
