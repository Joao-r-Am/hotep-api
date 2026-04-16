import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'professional_procedures'

  async up() {
    this.schema.raw(`
     CREATE TABLE professional_procedure (
        professional_id UUID REFERENCES professionals(id),
        procedure_id UUID REFERENCES procedures(id),
        PRIMARY KEY (professional_id, procedure_id)
    );
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
