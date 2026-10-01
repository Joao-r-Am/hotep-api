import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scheduling_invites'

  async up() {
    this.schema.raw(`
      CREATE TABLE scheduling_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token VARCHAR(64) NOT NULL,
        clinic_id UUID NOT NULL REFERENCES users(id),
        patient_id UUID REFERENCES patients(id),
        professional_id UUID REFERENCES professionals(id),
        procedure_ids UUID[],
        exam_ids UUID[],
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_by UUID NOT NULL REFERENCES users(id),
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        UNIQUE(token)
      );

      CREATE INDEX idx_scheduling_invites_clinic_expires
        ON scheduling_invites (clinic_id, expires_at);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
