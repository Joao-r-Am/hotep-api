import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'exams'

  async up() {
    this.schema.raw(`
   CREATE TABLE exams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      specialty VARCHAR(100),
      description TEXT,
      preparation_instructions TEXT,
      duration_minutes INTEGER,
      tags TEXT[],
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP,
      deleted_at TIMESTAMP
    );
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
