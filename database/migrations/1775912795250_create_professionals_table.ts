import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'professionals'

  async up() {
    this.schema.raw(`
     CREATE TABLE professionals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      document VARCHAR(20) UNIQUE NOT NULL,
      birth_date DATE,
      specialty VARCHAR(100),
      registration_number VARCHAR(50),
      phone VARCHAR(20),
      email VARCHAR(100),
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
