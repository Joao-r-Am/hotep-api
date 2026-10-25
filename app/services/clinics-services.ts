import Clinic from '#models/ClinicModel'
import ClinicMembership from '#models/ClinicMembershipModel'
import Role from '#models/RoleModel'
import Permission from '#models/PermissionModel'
import type { LucidModel } from '@adonisjs/lucid/types/model'
import { MembershipStatus } from '../interfaces/clinic.interface.js'
import { ApiException } from '../utils/api-error.js'

export type ClinicsServiceDeps = {
  clinicModel?: LucidModel
  membershipModel?: LucidModel
  roleModel?: LucidModel
  permissionModel?: LucidModel
}

export default class ClinicsService {
  private readonly clinicModel: LucidModel
  private readonly membershipModel: LucidModel
  private readonly roleModel: LucidModel
  private readonly permissionModel: LucidModel

  constructor(deps: ClinicsServiceDeps = {}) {
    this.clinicModel = deps.clinicModel ?? Clinic
    this.membershipModel = deps.membershipModel ?? ClinicMembership
    this.roleModel = deps.roleModel ?? Role
    this.permissionModel = deps.permissionModel ?? Permission
  }

  async listMyClinics(userId: string) {
    const memberships = await this.membershipModel
      .query()
      .where('user_id', userId)
      .whereNull('deleted_at')
      .whereNot('status', MembershipStatus.REMOVED)
      .orderBy('created_at', 'asc')
      .preload('clinic' as never)
      .preload('roles' as never)

    return {
      data: memberships.map((membership: any) => ({
        membership_id: String(membership.id),
        status: membership.status,
        clinic: membership.clinic ? membership.clinic.serialize() : null,
        roles: (membership.roles ?? []).map((role: any) => ({
          id: String(role.id),
          name: role.name,
        })),
      })),
    }
  }

  async readClinic(clinicId: string, userId: string): Promise<any> {
    const membership = await this.findActiveMembership(clinicId, userId)

    const clinic = await this.clinicModel
      .query()
      .where('id', clinicId)
      .whereNull('deleted_at')
      .first()

    if (!clinic) {
      throw new ApiException(404, 'CLINIC_NOT_FOUND', 'Clínica não encontrada.', {})
    }

    return {
      ...clinic.serialize(),
      membership: {
        id: String(membership.id),
        status: membership.status,
      },
    }
  }

  async listMembers(clinicId: string, userId: string) {
    await this.findActiveMembership(clinicId, userId)

    const memberships = await this.membershipModel
      .query()
      .where('clinic_id', clinicId)
      .whereNull('deleted_at')
      .whereNot('status', MembershipStatus.REMOVED)
      .orderBy('created_at', 'asc')
      .preload('user' as never)
      .preload('roles' as never)

    return {
      data: memberships.map((membership: any) => ({
        membership_id: String(membership.id),
        status: membership.status,
        user: membership.user ? membership.user.serialize() : null,
        roles: (membership.roles ?? []).map((role: any) => ({
          id: String(role.id),
          name: role.name,
        })),
      })),
    }
  }

  async listRoles(clinicId: string, userId: string) {
    await this.findActiveMembership(clinicId, userId)

    const roles = await this.roleModel
      .query()
      .whereNull('deleted_at')
      .where((query: any) => query.whereNull('clinic_id').orWhere('clinic_id', clinicId))
      .orderBy('name', 'asc')
      .preload('permissions' as never)

    return {
      data: roles.map((role: any) => ({
        id: String(role.id),
        clinic_id: role.clinic_id ? String(role.clinic_id) : null,
        name: role.name,
        is_system: role.is_system,
        permissions: (role.permissions ?? []).map((permission: any) => ({
          id: String(permission.id),
          code: permission.code,
          description: permission.description,
        })),
      })),
    }
  }

  async listPermissions() {
    const permissions = await this.permissionModel.query().orderBy('code', 'asc')

    return {
      data: permissions.map((permission: any) => permission.serialize()),
    }
  }

  private async findActiveMembership(clinicId: string, userId: string): Promise<any> {
    const membership = await this.membershipModel
      .query()
      .where('clinic_id', clinicId)
      .where('user_id', userId)
      .where('status', MembershipStatus.ACTIVE)
      .whereNull('deleted_at')
      .first()

    if (!membership) {
      throw new ApiException(
        403,
        'MEMBERSHIP_REQUIRED',
        'Usuário sem vínculo ativo com a clínica.',
        {}
      )
    }

    return membership
  }
}
