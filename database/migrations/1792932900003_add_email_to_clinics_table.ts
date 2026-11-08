import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clinics'

  async up() {
    // E-mail da empresa (nullable: linhagens antigas sem e-mail continuam válidas;
   // o cadastro novo, via validator, sempre fornece).
    this.schema.raw('ALTER TABLE clinics ADD COLUMN email VARCHAR(255);')
  }

  async down() {
    this.schema.raw('ALTER TABLE clinics DROP COLUMN IF EXISTS email;')
  }
}
