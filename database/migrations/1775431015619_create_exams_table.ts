import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'exams'

  async up() {
    this.schema.raw(`
      CREATE TABLE IF NOT EXISTS exams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        code VARCHAR(255) UNIQUE,
        description TEXT,
        observations TEXT,
        tags TEXT[],

        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
