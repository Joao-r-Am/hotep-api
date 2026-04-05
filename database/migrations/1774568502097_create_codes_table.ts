import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'codes'

  async up() {
       this.schema.raw(`
      CREATE TABLE IF NOT EXISTS codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(255) NOT NULL,
        user_id UUID NOT NULL,

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
