import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import ClinicMembership from '#models/ClinicMembershipModel'
import Role from '#models/RoleModel'
import logger from '@adonisjs/core/services/logger'
import { ApiException } from '../utils/api-error.js'
import { MembershipStatus } from '../interfaces/clinic.interface.js'

/**
 * Middleware tenant: valida o vínculo de clínica a cada requisição
 * e monta o accessContext (papéis e permissões resolvidos do banco).
 *
 * Os claims `clinic_id`/`membership_id` do token são apenas o ponto
 * de partida — o vínculo real e as permissões são revalidados aqui,
 * porque o token não é verdade atual de papéis.
 */
export default class AccessContextMiddleware {
  private readonly membershipModel: LucidModel
  private readonly roleModel: LucidModel

  constructor(membershipModel: LucidModel = ClinicMembership, roleModel: LucidModel = Role) {
    this.membershipModel = membershipModel
    this.roleModel = roleModel
  }

  async handle(ctx: HttpContext, next: NextFn) {
    const auth = ctx.auth

    if (!auth) {
      throw new ApiException(401, 'UNAUTHORIZED', 'Usuário não autenticado.', {})
    }

    const claims = auth.payload
    if (!claims?.clinic_id || !claims?.membership_id) {
      throw new ApiException(
        403,
        'CLINIC_CONTEXT_REQUIRED',
        'Usuário sem clínica ativa. Selecione ou crie uma clínica antes de acessar este recurso.',
        {}
      )
    }

    const membership: any = await this.membershipModel
      .query()
      .where('id', claims.membership_id)
      .where('clinic_id', claims.clinic_id)
      .where('user_id', claims.user_id)
      .whereNull('deleted_at')
      .first()

    if (!membership) {
      logger.warn(
        {
          user_id: claims.user_id,
          clinic_id: claims.clinic_id,
          membership_id: claims.membership_id,
        },
        'error.access_context.membership_not_found'
      )
      throw new ApiException(
        403,
        'MEMBERSHIP_MISMATCH',
        'Vínculo com a clínica inválido para este usuário.',
        {}
      )
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new ApiException(
        403,
        `MEMBERSHIP_${String(membership.status).toUpperCase()}`,
        'Vínculo com a clínica não está ativo.',
        { status: membership.status }
      )
    }

    const rolesRecord: any[] = await membership.related('roles').query()
    let permissions: string[] = []
    if (rolesRecord.length > 0) {
      const rolesBuilder: any = this.roleModel.query()
      rolesBuilder.whereIn(
        'id',
        rolesRecord.map((role: any) => role.id)
      )
      await rolesBuilder.preload('permissions')
      const rolesWithPermissions: any[] = (await rolesBuilder) as any[]
      permissions = [
        ...new Set(
          rolesWithPermissions.flatMap((role: any) =>
            (role.permissions ?? []).map((permission: any) => permission.code)
          )
        ),
      ]
    }

    ctx.accessContext = {
      userId: String(claims.user_id),
      clinicId: String(membership.clinic_id),
      membershipId: String(membership.id),
      roles: rolesRecord.map((role) => ({ id: String(role.id), name: role.name })),
      permissions,
    }

    return next()
  }
}
