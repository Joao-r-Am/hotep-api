import vine from '@vinejs/vine'
import { EspecialtyArea } from '../interfaces/users.inteface.js'

export const registerValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(3),
    email: vine.string().email(),
    password: vine.string().minLength(6),
    cnpjf: vine.string().minLength(11).unique({ table: 'users', column: 'cnpjf' }),
    phone: vine.string().minLength(10),
    especialty_area: vine.enum(EspecialtyArea),
  })
)
