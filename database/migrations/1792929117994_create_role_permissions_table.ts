import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'role_permissions'

  async up() {
    this.schema.raw(`
      CREATE TABLE role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id),
        permission_id UUID NOT NULL REFERENCES permissions(id),
        PRIMARY KEY (role_id, permission_id)
      );

      INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
        WHERE r.is_system AND r.name = 'owner';

      INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
        WHERE r.is_system AND r.name = 'admin' AND p.code <> 'billing.manage';

      INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
        WHERE r.is_system AND r.name = 'professional'
        AND p.code IN (
          'clinic.read', 'team.read', 'roles.read',
          'patients.read', 'professionals.read', 'procedures.read', 'exams.read',
          'schedule.read', 'schedule.write',
          'appointments.read', 'appointments.write',
          'scheduling_invites.read', 'scheduling_invites.write'
        );

      INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
        WHERE r.is_system AND r.name = 'operator'
        AND p.code IN (
          'clinic.read',
          'patients.read', 'patients.write',
          'professionals.read', 'procedures.read', 'exams.read',
          'schedule.read',
          'appointments.read', 'appointments.write',
          'scheduling_invites.read', 'scheduling_invites.write'
        );
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
