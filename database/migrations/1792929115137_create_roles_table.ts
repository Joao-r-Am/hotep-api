import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'roles'

  async up() {
    this.schema.raw(`
      CREATE TABLE roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clinic_id UUID REFERENCES clinics(id),
        name VARCHAR(64) NOT NULL,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        UNIQUE(clinic_id, name)
      );

      INSERT INTO roles (clinic_id, name, is_system) VALUES
        (NULL, 'owner', true),
        (NULL, 'admin', true),
        (NULL, 'professional', true),
        (NULL, 'operator', true);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
