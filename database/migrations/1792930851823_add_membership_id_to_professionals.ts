import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'professionals';

  async up() {
    this.schema.raw(`
      ALTER TABLE professionals
        ADD COLUMN membership_id UUID REFERENCES clinic_memberships(id);

      CREATE INDEX idx_professionals_membership
        ON professionals (membership_id);
    `);
  }

  async down() {
    this.schema.raw(`
      DROP INDEX IF EXISTS idx_professionals_membership;
      ALTER TABLE professionals DROP COLUMN IF EXISTS membership_id;
    `);
  }
}
