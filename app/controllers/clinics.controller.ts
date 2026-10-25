import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import ClinicsService from '#services/clinics-services'
import { ApiException, sendErrorResponse } from '../utils/api-error.js'

@inject()
export default class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  private requireUser(ctx: HttpContext) {
    const user = ctx.auth?.user
    if (!user) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Usuário não autenticado.', {})
    }
    return user
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
