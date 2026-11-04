import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'membership_roles'

  async up() {
    this.schema.raw(`
      CREATE TABLE membership_roles (
        membership_id UUID NOT NULL REFERENCES clinic_memberships(id),
        role_id UUID NOT NULL REFERENCES roles(id),
        PRIMARY KEY (membership_id, role_id)
      );

      CREATE INDEX idx_membership_roles_role
        ON membership_roles (role_id);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
