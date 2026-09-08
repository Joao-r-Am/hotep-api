import { BaseSchema } from '@adonisjs/lucid/schema';

export default class extends BaseSchema {
  protected tableName = 'users';

  async up() {
    this.schema.raw(`
      ALTER TABLE users
      ALTER COLUMN active SET DEFAULT true,
      ALTER COLUMN active SET NOT NULL
    `);
  }

  async down() {
    this.schema.raw(`
      ALTER TABLE users
      ALTER COLUMN active DROP DEFAULT,
      ALTER COLUMN active DROP NOT NULL
    `);
  }
}
