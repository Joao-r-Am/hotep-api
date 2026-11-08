import { DateTime } from 'luxon';
import { BaseModel, column } from '@adonisjs/lucid/orm';
import type { UUID } from 'node:crypto';

/**
 * Endereço reutilizável (polimórfico): nunca referencia o dono
 * diretamente — o vínculo vive em `address_bond`.
 */
export default class Address extends BaseModel {
  static table = 'address';

  @column({ isPrimary: true })
  declare id: UUID;

  @column()
  declare street: string;

  @column()
  declare number: string | null;

  @column()
  declare complement: string | null;

  @column()
  declare district: string | null;

  @column()
  declare city: string | null;

  @column()
  declare state: string | null;

  @column()
  declare country: string;

  @column()
  declare zip: string | null;

  @column.dateTime()
  declare deleted_at: DateTime | null;

  @column.dateTime({ autoCreate: true })
  declare created_at: DateTime;

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updated_at: DateTime | null;
}
