import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.raw(`
      ALTER TABLE users ADD CONSTRAINT cnpjf UNIQUE (cnpjf);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
