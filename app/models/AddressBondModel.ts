import { DateTime } from 'luxon';
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm';
import type { BelongsTo } from '@adonisjs/lucid/types/relations';
import type { UUID } from 'node:crypto';
import Address from './AddressModel.js';

/**
 * Ligação entre um endereço e o seu dono (clínica, paciente, profissional, ...).
 *
 * `owner_table` nomeia a tabela do dono e `owner_id` a linha correspondente;
 * a unicidade em (owner_table, owner_id) garante **um** endereço por dono.
 * Donos válidos são controlados pela whitelist do `AddressService`.
 */
export default class AddressBond extends BaseModel {
  static table = 'address_bond';

  @column({ isPrimary: true })
  declare id: UUID;

  @column()
  declare address_id: UUID;

  @column()
  declare owner_table: string;

  @column()
  declare owner_id: UUID;

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | null;

  @belongsTo(() => Address, {
    foreignKey: 'address_id',
  })
  declare address: BelongsTo<typeof Address>;
}
