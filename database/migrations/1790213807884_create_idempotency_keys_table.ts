import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'idempotency_keys'

  async up() {
    this.schema.raw(`
      CREATE TABLE idempotency_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(255) NOT NULL,
        scope VARCHAR(64) NOT NULL,
        status_code INTEGER NOT NULL,
        response JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(key)
      );

      CREATE INDEX idx_idempotency_keys_created_at
        ON idempotency_keys (created_at);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
