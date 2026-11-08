import Clinic from '#models/ClinicModel';
import ClinicMembership from '#models/ClinicMembershipModel';
import Role from '#models/RoleModel';
import Permission from '#models/PermissionModel';
import db from '@adonisjs/lucid/services/db';
import type { LucidModel } from '@adonisjs/lucid/types/model';
import { randomUUID } from 'node:crypto';
import { createClinicValidator, selectClinicValidator } from '#validators/clinics';
import { MembershipStatus } from '../interfaces/clinic.interface.js';
import { ApiException } from '../utils/api-error.js';
import Ujwt, { type ITokenClinicContext } from '../utils/jwt.js';
import type { IAuthPayload } from '../types/auth.js';
import AddressService, { type IAddressRecord } from './address-service.js';

export type ClinicsServiceDeps = {
  clinicModel?: LucidModel;
  membershipModel?: LucidModel;
  roleModel?: LucidModel;
  permissionModel?: LucidModel;
  addressService?: AddressService;
  createClinicValidator?: { validate(data: Record<string, unknown>): Promise<Record<string, any>> };
  selectClinicValidator?: { validate(data: Record<string, unknown>): Promise<Record<string, any>> };
  jwt?: {
    generateToken(user: unknown, clinicContext?: ITokenClinicContext): string;
    verifyToken(token: string): Record<string, unknown>;
  };
  db?: {
    transaction: <T>(cb: (client: unknown) => Promise<T>) => Promise<T>;
  };
};

export default class ClinicsService {
  private readonly clinicModel: LucidModel;
  private readonly membershipModel: LucidModel;
  private readonly roleModel: LucidModel;
  private readonly permissionModel: LucidModel;
  private readonly addressService: AddressService;
  private readonly createClinicValidator: NonNullable<ClinicsServiceDeps['createClinicValidator']>;
  private readonly selectClinicValidator: NonNullable<ClinicsServiceDeps['selectClinicValidator']>;
  private readonly jwt: NonNullable<ClinicsServiceDeps['jwt']>;
  private readonly db: NonNullable<ClinicsServiceDeps['db']>;

  constructor(deps: ClinicsServiceDeps = {}) {
    this.clinicModel = deps.clinicModel ?? Clinic;
    this.membershipModel = deps.membershipModel ?? ClinicMembership;
    this.roleModel = deps.roleModel ?? Role;
    this.permissionModel = deps.permissionModel ?? Permission;
    this.addressService = deps.addressService ?? new AddressService();
    this.createClinicValidator = deps.createClinicValidator ?? createClinicValidator;
    this.selectClinicValidator = deps.selectClinicValidator ?? selectClinicValidator;
    this.jwt = deps.jwt ?? Ujwt;
    this.db = deps.db ?? db;
  }

  async listMyClinics(userId: string) {
    const memberships = await this.membershipModel
      .query()
      .where('user_id', userId)
      .whereNull('deleted_at')
      .whereNot('status', MembershipStatus.REMOVED)
      .orderBy('created_at', 'asc')
      .preload('clinic' as never)
      .preload('roles' as never);

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
    };
  }

  async readClinic(clinicId: string, userId: string): Promise<any> {
    const membership = await this.findActiveMembership(clinicId, userId);

    const clinic = await this.clinicModel.query().where('id', clinicId).whereNull('deleted_at').first();

    if (!clinic) {
      throw new ApiException(404, 'CLINIC_NOT_FOUND', 'Clínica não encontrada.', {});
    }

    return {
      ...clinic.serialize(),
      membership: {
        id: String(membership.id),
        status: membership.status,
      },
    };
  }

  async listMembers(clinicId: string, userId: string) {
    await this.findActiveMembership(clinicId, userId);

    const memberships = await this.membershipModel
      .query()
      .where('clinic_id', clinicId)
      .whereNull('deleted_at')
      .whereNot('status', MembershipStatus.REMOVED)
      .orderBy('created_at', 'asc')
      .preload('user' as never)
      .preload('roles' as never);

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
    };
  }

  async listRoles(clinicId: string, userId: string) {
    await this.findActiveMembership(clinicId, userId);

    const roles = await this.roleModel
      .query()
      .whereNull('deleted_at')
      .where((query: any) => query.whereNull('clinic_id').orWhere('clinic_id', clinicId))
      .orderBy('name', 'asc')
      .preload('permissions' as never);

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
    };
  }

  async listPermissions() {
    const permissions = await this.permissionModel.query().orderBy('code', 'asc');

    return {
      data: permissions.map((permission: any) => permission.serialize()),
    };
  }

  /**
   * Seleciona o vínculo ativo do usuário para emissão de token com
   * contexto de clínica. Não emite token — responsabilidade do controller.
   */
  async selectClinic(userId: string, membershipId: string): Promise<any> {
    const membership: any = await this.membershipModel.query().where('id', membershipId).whereNull('deleted_at').first();

    if (!membership) {
      throw new ApiException(404, 'MEMBERSHIP_NOT_FOUND', 'Vínculo com a clínica não encontrado.', {});
    }

    if (String(membership.user_id) !== String(userId)) {
      throw new ApiException(403, 'MEMBERSHIP_MISMATCH', 'Vínculo com a clínica inválido para este usuário.', {});
    }

    if (membership.status !== MembershipStatus.ACTIVE) {
      throw new ApiException(403, `MEMBERSHIP_${String(membership.status).toUpperCase()}`, 'Vínculo com a clínica não está ativo.', {
        status: membership.status,
      });
    }

    return {
      membership_id: String(membership.id),
      clinic_id: String(membership.clinic_id),
      status: membership.status,
      clinic: membership.clinic ? membership.clinic.serialize() : null,
    };
  }

  /**
   * Regra de negócio completa da seleção de clínica, movida do controller:
   * valida o body, valida o vínculo e emite o novo token com contexto.
   * O controller apenas repassa resposta e cabeçalhos.
   */
  async selectClinicWithToken(account: IAuthPayload, payload: Record<string, unknown>): Promise<any> {
    const body = await this.selectClinicValidator.validate(payload);

    const selection = await this.selectClinic(account.user_id, body.membership_id);

    const token = this.jwt.generateToken(
      {
        id: account.user_id,
        email: account.email,
        name: account.name,
        cnpjf: account.cnpjf,
        especialty_area: account.especialty_area,
        access_type: account.access_type,
      },
      {
        clinic_id: selection.clinic_id,
        membership_id: selection.membership_id,
      },
    );

    return {
      token,
      membership_id: selection.membership_id,
      clinic_id: selection.clinic_id,
      clinic: selection.clinic,
    };
  }

  /**
   * Cria a clínica do owner: clínica + membership ativo + papel `owner`
   * + endereço (address/address_bond), em transação única.
   * Assinatura/limites de plano ficam para a Fase 4.
   */
  async createClinic(userId: string, payload: Record<string, unknown>): Promise<any> {
    const validated = await this.createClinicValidator.validate(payload);
    // `address` não é coluna de clinics: vai para as tabelas address/address_bond.
    const { address, ...clinicPayload } = validated;

    const ownerRole: any = await this.roleModel
      .query()
      .whereNull('clinic_id')
      .where('name', 'owner')
      .where('is_system', true)
      .whereNull('deleted_at')
      .first();

    if (!ownerRole) {
      throw new ApiException(500, 'OWNER_ROLE_MISSING', 'Papel owner não catalogado no sistema.', {});
    }

    let clinic: any;
    let membership: any;
    let addressRecord: IAddressRecord | null = null;

    await this.db.transaction(async (client: any) => {
      const created_clinic = (await this.clinicModel.create({ ...clinicPayload, id: randomUUID() }, { client })) as any;

      const membershipOwner = (await this.membershipModel.create(
        {
          clinic_id: created_clinic.id,
          user_id: userId,
          status: MembershipStatus.ACTIVE,
        },
        { client },
      )) as any;

      await client.table('membership_roles').insert({ membership_id: membershipOwner.id, role_id: ownerRole.id });

      addressRecord = await this.addressService.setFor('clinics', created_clinic.id, address ?? null, { client });

      clinic = created_clinic;
      membership = membershipOwner;
    });

    return {
      clinic: clinic.serialize(),
      membership: { id: String(membership.id), status: membership.status },
      roles: [{ id: String(ownerRole.id), name: ownerRole.name }],
      address: addressRecord,
    };
  }

  /**
   * Localiza no próprio banco a clínica pelo CNPJ informado, para oferecer
   * "vincular-se" em vez de criar clínica duplicada.
   */
  async findLocalByCnpj(cnpjf: string): Promise<any> {
    const digits = String(cnpjf).replace(/\D/g, '');

    if (digits.length !== 14) {
      throw new ApiException(400, 'CNPJ_INVALID', 'CNPJ inválido: informe os 14 dígitos.', {});
    }

    const clinic = await this.clinicModel.query().where('cnpjf', digits).whereNull('deleted_at').first();

    if (!clinic) {
      throw new ApiException(404, 'CLINIC_NOT_FOUND', 'Nenhuma clínica cadastrada com este CNPJ.', {});
    }

    return clinic.serialize();
  }

  /**
   * Vincula o usuário logado a uma clínica existente: cria membership
   * `active` + papel de sistema `operator` em transação única (o convite/
   * aprovação com papéis escolhidos fica para a Fase 4).
   */
  async linkUser(clinicId: string, userId: string): Promise<any> {
    const clinic: any = await this.clinicModel.query().where('id', clinicId).whereNull('deleted_at').first();

    if (!clinic) {
      throw new ApiException(404, 'CLINIC_NOT_FOUND', 'Clínica não encontrada.', {});
    }

    const existing: any = await this.membershipModel
      .query()
      .where('clinic_id', clinicId)
      .where('user_id', userId)
      .whereNull('deleted_at')
      .first();

    if (existing) {
      throw new ApiException(409, 'MEMBER_ALREADY_LINKED', 'Usuário já está vinculado a esta clínica.', {});
    }

    const operatorRole: any = await this.roleModel
      .query()
      .whereNull('clinic_id')
      .where('name', 'operator')
      .where('is_system', true)
      .whereNull('deleted_at')
      .first();

    if (!operatorRole) {
      throw new ApiException(500, 'OPERATOR_ROLE_MISSING', 'Papel operator não catalogado no sistema.', {});
    }

    let membership: any;

    await this.db.transaction(async (client: any) => {
      const linkedMembership = (await this.membershipModel.create(
        {
          clinic_id: clinic.id,
          user_id: userId,
          status: MembershipStatus.ACTIVE,
        },
        { client },
      )) as any;

      await client.table('membership_roles').insert({ membership_id: linkedMembership.id, role_id: operatorRole.id });

      membership = linkedMembership;
    });

    return {
      clinic: clinic.serialize(),
      membership: { id: String(membership.id), status: membership.status },
      roles: [{ id: String(operatorRole.id), name: operatorRole.name }],
    };
  }

  private async findActiveMembership(clinicId: string, userId: string): Promise<any> {
    const membership = await this.membershipModel
      .query()
      .where('clinic_id', clinicId)
      .where('user_id', userId)
      .where('status', MembershipStatus.ACTIVE)
      .whereNull('deleted_at')
      .first();

    if (!membership) {
      throw new ApiException(403, 'MEMBERSHIP_REQUIRED', 'Usuário sem vínculo ativo com a clínica.', {});
    }

    return membership;
  }
}
