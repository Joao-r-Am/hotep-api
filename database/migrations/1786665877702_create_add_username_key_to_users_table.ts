import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.raw(`
     alter table users
     add column username varchar(50);
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
