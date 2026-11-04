import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tenantTables = [
    'patients',
    'professionals',
    'procedures',
    'schedule_slots',
    'appointments',
    'professional_exam',
    'professional_procedure',
  ]

  async up() {
    for (const table of this.tenantTables) {
      this.schema.raw(`ALTER TABLE ${table} ADD COLUMN clinic_id UUID REFERENCES clinics(id);`)
    }

    this.schema.raw(`
      CREATE INDEX idx_patients_clinic ON patients (clinic_id);
      CREATE INDEX idx_professionals_clinic ON professionals (clinic_id);
      CREATE INDEX idx_procedures_clinic ON procedures (clinic_id);
      CREATE INDEX idx_schedule_slots_clinic ON schedule_slots (clinic_id);
      CREATE INDEX idx_appointments_clinic ON appointments (clinic_id);
    `)
  }

  async down() {
    this.schema.raw(`
      DROP INDEX IF EXISTS idx_appointments_clinic;
      DROP INDEX IF EXISTS idx_schedule_slots_clinic;
      DROP INDEX IF EXISTS idx_procedures_clinic;
      DROP INDEX IF EXISTS idx_professionals_clinic;
      DROP INDEX IF EXISTS idx_patients_clinic;
    `)

    for (const table of this.tenantTables) {
      this.schema.raw(`ALTER TABLE ${table} DROP COLUMN IF EXISTS clinic_id;`)
    }
  }
}
