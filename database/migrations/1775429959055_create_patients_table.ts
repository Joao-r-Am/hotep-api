import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'patients'

  async up() {
    this.schema.raw(`
      CREATE TABLE IF NOT EXISTS patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        cnpjf VARCHAR(14) NOT NULL UNIQUE,
        email VARCHAR(255),
        phone VARCHAR(255) NOT NULL,
        phone_secondary VARCHAR(255),
        birthday TIMESTAMP,
        observations TEXT,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
