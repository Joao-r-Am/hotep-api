import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'appointments'

  async up() {
    this.schema.raw(`
      CREATE UNIQUE INDEX uq_slot_active
        ON appointments (schedule_slot_id, start_time)
        WHERE deleted_at IS NULL
          AND status NOT IN ('cancelled', 'no_show', 'CANCELLED', 'NO_SHOW');
    `)
  }

  async down() {
    this.schema.raw(`DROP INDEX IF EXISTS uq_slot_active;`)
  }
}
