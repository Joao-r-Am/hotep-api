import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'permissions'

  async up() {
    this.schema.raw(`
      CREATE TABLE permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(64) NOT NULL UNIQUE,
        description VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO permissions (code, description) VALUES
        ('clinic.read', 'Visualizar dados da clínica'),
        ('clinic.update', 'Editar dados da clínica'),
        ('team.read', 'Visualizar equipe e vínculos'),
        ('team.invite', 'Convidar membros para a clínica'),
        ('team.manage', 'Alterar status e papéis de membros'),
        ('roles.read', 'Visualizar papéis e permissões'),
        ('roles.manage', 'Criar e editar papéis personalizados'),
        ('patients.read', 'Visualizar pacientes'),
        ('patients.write', 'Criar e editar pacientes'),
        ('professionals.read', 'Visualizar profissionais'),
        ('professionals.write', 'Criar e editar profissionais'),
        ('procedures.read', 'Visualizar procedimentos'),
        ('procedures.write', 'Criar e editar procedimentos'),
        ('exams.read', 'Visualizar exames'),
        ('schedule.read', 'Visualizar agenda e horários'),
        ('schedule.write', 'Criar e editar horários'),
        ('appointments.read', 'Visualizar consultas'),
        ('appointments.write', 'Criar e editar consultas'),
        ('scheduling_invites.read', 'Visualizar convites de agendamento'),
        ('scheduling_invites.write', 'Gerar e revogar convites de agendamento'),
        ('billing.read', 'Visualizar plano e assinatura'),
        ('billing.manage', 'Gerenciar assinatura e cobrança');
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
