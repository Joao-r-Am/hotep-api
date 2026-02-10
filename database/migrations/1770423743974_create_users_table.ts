import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.raw(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

        name VARCHAR(100) NOT NULL,
        cnpjf VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(100) NOT NULL,
        site_page VARCHAR(100),
        birthday TIMESTAMP,

        access_type integer,
        especialty_area VARCHAR(100),
        roles text[],

        logo text,
        max_users integer,
        sub_expires_at TIMESTAMP,
        active BOOLEAN,


        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
