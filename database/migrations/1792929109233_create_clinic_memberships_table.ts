import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clinic_memberships'

  async up() {
    this.schema.raw(`
      CREATE TABLE clinic_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clinic_id UUID NOT NULL REFERENCES clinics(id),
        user_id UUID NOT NULL REFERENCES users(id),
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP,
        UNIQUE(clinic_id, user_id),
        CHECK (status IN ('active', 'suspended', 'removed'))
      );

      CREATE INDEX idx_clinic_memberships_user
        ON clinic_memberships (user_id);

      CREATE INDEX idx_clinic_memberships_clinic
        ON clinic_memberships (clinic_id);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
