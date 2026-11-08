import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'address_bond'

  async up() {
    this.schema.raw(`
      CREATE TABLE address_bond (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        address_id UUID NOT NULL REFERENCES address(id) ON DELETE CASCADE,
        owner_table VARCHAR(60) NOT NULL,
        owner_id UUID NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(owner_table, owner_id)
      );
      CREATE INDEX address_bond_address_id_index ON address_bond(address_id);
      CREATE INDEX address_bond_owner_index ON address_bond(owner_table, owner_id);
    `)
  }

  async down() {
    this.schema.dropTable('address_bond')
  }
}
