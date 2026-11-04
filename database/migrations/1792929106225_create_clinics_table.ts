import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clinics'

  async up() {
    this.schema.raw(`
      CREATE TABLE clinics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        cnpjf VARCHAR(14),
        phone VARCHAR(20),
        site_page VARCHAR(255),
        logo TEXT,
        max_users INTEGER,
        sub_expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        UNIQUE(cnpjf)
      );
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
