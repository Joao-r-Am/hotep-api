import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import PublicSchedulingService from '#services/public-scheduling-service'
import RateLimitService, { RATE_LIMIT_IDENTIFY } from '#services/rate-limit-service'
import {
  availabilityQueryValidator,
  createAppointmentValidator,
  identifyPatientValidator,
  proceduresQueryValidator,
  registerPatientValidator,
} from '#validators/scheduling'
import { validateOrThrow } from '../utils/validate-request.js'
import { ApiException, sendErrorResponse } from '../utils/api-error.js'

/**
 * Rotas públicas de auto-agendamento (sem autenticação).
 *
 * Todas dependem do middleware `validateSchedulingToken`, que valida o
 * token, aplica rate-limit geral (30/min) e anexa `ctx.schedulingInvite`.
 */
@inject()
export default class PublicSchedulingController {
  constructor(
    private readonly publicSchedulingService: PublicSchedulingService,
    private readonly rateLimit: RateLimitService
  ) {}

  async context(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const result = await this.publicSchedulingService.getContext(invite)
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async identify(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)

      // Rate limit mais agressivo na identificação (10/min por token+IP).
      await this.rateLimit.assertAllowed(
        `public:identify:${invite.token}:${ctx.request.ip()}`,
        RATE_LIMIT_IDENTIFY
      )
      const payload = await validateOrThrow(ctx.request, identifyPatientValidator)
      const result = await this.publicSchedulingService.identifyPatient(invite, payload.cpf)
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async register(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const payload = await validateOrThrow(ctx.request, registerPatientValidator)
      const result = await this.publicSchedulingService.registerPatient(invite, payload)
      return ctx.response.status(201).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async professionals(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const result = await this.publicSchedulingService.listProfessionals(invite)
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async procedures(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const query = await validateOrThrow(ctx.request, proceduresQueryValidator)
      const result = await this.publicSchedulingService.listProcedures(
        invite,
        query.professional_id
      )
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async availability(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const query = await validateOrThrow(ctx.request, availabilityQueryValidator)
      const result = await this.publicSchedulingService.findAvailability(invite, query)
      return ctx.response.status(200).json({ days: result })
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async createAppointment(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const idempotencyKey = ctx.request.header('Idempotency-Key')

      if (!idempotencyKey) {
        throw new ApiException(
          400,
          'IDEMPOTENCY_KEY_REQUIRED',
          'O header Idempotency-Key é obrigatório.',
          {}
        )
      }

      const payload = await validateOrThrow(ctx.request, createAppointmentValidator)
      const result = await this.publicSchedulingService.createAppointment(
        invite,
        payload,
        idempotencyKey
      )
      return ctx.response.status(result.statusCode).json(result.response)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async ics(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const appointmentId = String(ctx.request.param('id'))
      const { filename, content } = await this.publicSchedulingService.buildIcsEvent(
        invite,
        appointmentId
      )

      return ctx.response
        .header('Content-Type', 'text/calendar; charset=utf-8')
        .header('Content-Disposition', `inline; filename="${filename}"`)
        .send(content)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  /**
   * Convite em PDF do agendamento, com QR Code para o paciente reabrir
   * a própria tela. O conteúdo é gerado sob demanda (HTML + Chrome headless),
   * então cada chamada paga o custo da renderização.
   */
  async pdf(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const appointmentId = String(ctx.request.param('id'))
      const { filename, buffer } = await this.publicSchedulingService.buildPdfInvite(invite, appointmentId)

      return ctx.response
        .header('Content-Type', 'application/pdf')
        .header('Content-Length', String(buffer.length))
        .header('Content-Disposition', `inline; filename="${filename}"`)
        .header('Cache-Control', 'private, no-store')
        .send(buffer)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  async cancel(ctx: HttpContext) {
    try {
      const invite = this.invite(ctx)
      const appointmentId = String(ctx.request.param('id'))
      const result = await this.publicSchedulingService.cancelAppointment(invite, appointmentId)
      return ctx.response.status(200).json(result)
    } catch (error) {
      return sendErrorResponse(ctx, error)
    }
  }

  private invite(ctx: HttpContext) {
    return (ctx as any).schedulingInvite
  }
}
