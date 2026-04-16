import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'appointments'

  async up() {
    this.schema.raw(`
      CREATE TABLE appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id),
        professional_id UUID NOT NULL REFERENCES professionals(id),
        exam_id UUID REFERENCES exams(id),
        procedure_id UUID REFERENCES procedures(id),
        schedule_slot_id UUID REFERENCES schedule_slots(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status VARCHAR(20) NOT NULL,
        notes TEXT,
        is_blocked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        deleted_at TIMESTAMP,
        closed_at TIMESTAMP
    );
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
