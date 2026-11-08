import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'address'

  async up() {
    this.schema.raw(`
      CREATE TABLE address (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        street VARCHAR(255) NOT NULL,
        number VARCHAR(20),
        complement VARCHAR(120),
        district VARCHAR(120),
        city VARCHAR(120),
        state VARCHAR(80),
        country VARCHAR(80) NOT NULL DEFAULT 'Brasil',
        zip VARCHAR(20),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      );
    `)
  }

  async down() {
    this.schema.dropTable('address')
  }
}
