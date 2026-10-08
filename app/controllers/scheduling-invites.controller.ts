import { inject } from '@adonisjs/core';
import type { HttpContext } from '@adonisjs/core/http';
import SchedulingInvitesService from '#services/scheduling-invites-service';
import { createSchedulingInviteValidator } from '#validators/scheduling';
import { validateOrThrow } from '../utils/validate-request.js';
import { ApiException, sendErrorResponse } from '../utils/api-error.js';

@inject()
export default class SchedulingInvitesController {
  constructor(private readonly schedulingInvitesService: SchedulingInvitesService) {}

  async create(ctx: HttpContext) {
    try {
      const { request, response } = ctx;
      const payload = await validateOrThrow(request, createSchedulingInviteValidator);

      const user = ctx.auth?.user;
      if (!user) {
        throw new ApiException(401, 'UNAUTHORIZED', 'Operador não autenticado.', {});
      }

      const invite = await this.schedulingInvitesService.create(user.user_id, user.user_id, payload);
      return response.status(201).json(invite);
    } catch (error) {
      return sendErrorResponse(ctx, error);
    }
  }

  async list(ctx: HttpContext) {
    try {
      const { request, response } = ctx;
      const clinic_id = request.input('clinic_id');
      const user = ctx.auth?.user;

      if (!user) {
        throw new ApiException(401, 'UNAUTHORIZED', 'Operador não autenticado.', {});
      }

      if (clinic_id && clinic_id !== user.user_id) {
        throw new ApiException(403, 'FORBIDDEN', 'Operador só pode acessar convites da própria clínica.', {});
      }

      const result = await this.schedulingInvitesService.list(user.user_id);
      return response.status(200).json(result);
    } catch (error) {
      return sendErrorResponse(ctx, error);
    }
  }

  async revoke(ctx: HttpContext) {
    try {
      const { request, response } = ctx;
      const id = String(request.param('id'));
      const user = ctx.auth?.user;

      if (!user) {
        throw new ApiException(401, 'UNAUTHORIZED', 'Operador não autenticado.', {});
      }

      const result = await this.schedulingInvitesService.revoke(id, user.user_id);
      return response.status(200).json(result);
    } catch (error) {
      return sendErrorResponse(ctx, error);
    }
  }
}
