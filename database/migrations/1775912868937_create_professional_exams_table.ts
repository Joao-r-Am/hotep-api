import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'professional_exams'

  async up() {
    this.schema.raw(`
     CREATE TABLE professional_exam (
        professional_id UUID REFERENCES professionals(id),
        exam_id UUID REFERENCES exams(id),
        PRIMARY KEY (professional_id, exam_id)
    );
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
