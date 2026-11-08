import Address from '#models/AddressModel';
import AddressBond from '#models/AddressBondModel';
import db from '@adonisjs/lucid/services/db';
import type { LucidModel } from '@adonisjs/lucid/types/model';
import { randomUUID } from 'node:crypto';
import { ApiException } from '../utils/api-error.js';

/**
 * Tabelas de dono que podem ter endereço vinculado.
 * Toda gravação/leitura/remoção passa pelo `assertOwnerTable` —
 * nunca aceitar `owner_table` de origem externa fora desta lista.
 */
export const ADDRESS_OWNER_TABLES = ['clinics', 'patients', 'professionals'] as const;
export type AddressOwnerTable = (typeof ADDRESS_OWNER_TABLES)[number];

export interface IAddressPayload {
  street: string;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
}

export interface IAddressRecord {
  id: string;
  street: string;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  country: string;
  zip: string | null;
}

export type AddressServiceDeps = {
  addressModel?: LucidModel;
  addressBondModel?: LucidModel;
  db?: {
    transaction: <T>(cb: (client: unknown) => Promise<T>) => Promise<T>;
  };
};

export type AddressClientOpts = { client?: unknown };

export default class AddressService {
  private readonly addressModel: LucidModel;
  private readonly addressBondModel: LucidModel;
  private readonly db: NonNullable<AddressServiceDeps['db']>;
  private readonly allowedOwnerTables: Set<string>;

  constructor(deps: AddressServiceDeps = {}) {
    this.addressModel = deps.addressModel ?? Address;
    this.addressBondModel = deps.addressBondModel ?? AddressBond;
    this.db = deps.db ?? db;
    this.allowedOwnerTables = new Set<string>(ADDRESS_OWNER_TABLES);
  }

  /** Valida e normaliza os dados de endereço (campos desconhecidos são descartados). */
  static normalizePayload(
    payload: IAddressPayload | Record<string, unknown> | null | undefined,
  ): Omit<IAddressRecord, 'id'> | null {
    if (!payload || typeof payload !== 'object' || !String(payload.street ?? '').trim()) {
      return null;
    }
    const optional = (value: unknown): string | null => {
      const text = typeof value === 'string' ? value.trim() : '';
      return text ? text : null;
    };
    return {
      street: String(payload.street).trim(),
      number: optional(payload.number),
      complement: optional(payload.complement),
      district: optional(payload.district),
      city: optional(payload.city),
      state: optional(payload.state),
      country: optional(payload.country) ?? 'Brasil',
      zip: optional(payload.zip),
    };
  }

  assertOwnerTable(ownerTable: string): void {
    if (!this.allowedOwnerTables.has(ownerTable)) {
      throw new ApiException(
        400,
        'ADDRESS_OWNER_TABLE_INVALID',
        `owner_table inválida: só é possível vincular endereço a ${ADDRESS_OWNER_TABLES.join(', ')}.`,
        { owner_table: ownerTable },
      );
    }
  }

  /**
   * Cria ou atualiza o endereço do dono (um por dono, garantido pelo
   * unique em address_bond). Se `opts.client` for informado, tudo roda
   * na transação do chamador (ex.: criação da clínica); senão, abre a própria.
   */
  async setFor(
    ownerTable: AddressOwnerTable | string,
    ownerId: string,
    payload: IAddressPayload | Record<string, unknown> | null | undefined,
    opts: AddressClientOpts = {},
  ): Promise<IAddressRecord | null> {
    this.assertOwnerTable(ownerTable);
    const values = AddressService.normalizePayload(payload);
    if (!values) {
      return null;
    }

    const run = async (client: unknown): Promise<IAddressRecord> => {
      const bond: any = await this.addressBondModel
        .query({ client } as never)
        .where('owner_table', ownerTable)
        .where('owner_id', ownerId)
        .first();

      const addressPayload = {
        street: values.street,
        number: values.number,
        complement: values.complement,
        district: values.district,
        city: values.city,
        state: values.state,
        country: values.country,
        zip: values.zip,
      };

      if (bond) {
        await this.addressModel
          .query({ client } as never)
          .where('id', bond.address_id)
          .update(addressPayload);
        return { id: String(bond.address_id), ...addressPayload };
      }

      const addressId = randomUUID();
      await this.addressModel.create({ id: addressId, ...addressPayload }, { client } as never);
      await this.addressBondModel.create(
        {
          id: randomUUID(),
          address_id: addressId,
          owner_table: ownerTable,
          owner_id: ownerId,
        },
        { client } as never,
      );

      return { id: addressId, ...addressPayload };
    };

    if (opts.client) {
      return run(opts.client);
    }

    return this.db.transaction(run);
  }

  /** Endereço atual do dono (ou null quando não vinculado). */
  async getFor(
    ownerTable: AddressOwnerTable | string,
    ownerId: string,
    opts: AddressClientOpts = {},
  ): Promise<IAddressRecord | null> {
    this.assertOwnerTable(ownerTable);

    const bond: any = await this.addressBondModel
      .query({ client: opts.client } as never)
      .where('owner_table', ownerTable)
      .where('owner_id', ownerId)
      .first();

    if (!bond) {
      return null;
    }

    const address: any = await this.addressModel
      .query({ client: opts.client } as never)
      .where('id', bond.address_id)
      .whereNull('deleted_at')
      .first();

    if (!address) {
      return null;
    }

    return {
      id: String(address.id),
      street: address.street,
      number: address.number,
      complement: address.complement,
      district: address.district,
      city: address.city,
      state: address.state,
      country: address.country,
      zip: address.zip,
    };
  }

  /**
   * Remove o vínculo e marca o endereço para remoção (soft delete).
   * Retorna `false` quando o dono não tem endereço.
   */
  async remove(
    ownerTable: AddressOwnerTable | string,
    ownerId: string,
    opts: AddressClientOpts = {},
  ): Promise<boolean> {
    this.assertOwnerTable(ownerTable);

    const run = async (client: unknown): Promise<boolean> => {
      const bond: any = await this.addressBondModel
        .query({ client } as never)
        .where('owner_table', ownerTable)
        .where('owner_id', ownerId)
        .first();

      if (!bond) {
        return false;
      }

      await this.addressBondModel
        .query({ client } as never)
        .where('id', bond.id)
        .delete();
      await this.addressModel
        .query({ client } as never)
        .where('id', bond.address_id)
        .update({ deleted_at: new Date() });

      return true;
    };

    if (opts.client) {
      return run(opts.client);
    }

    return this.db.transaction(run);
  }
}
