import vine from '@vinejs/vine'

export const selectClinicValidator = vine.compile(
  vine.object({
    membership_id: vine.string().uuid(),
  })
)

/**
 * Dados de endereço aninhados no form de criação da clínica.
 * Validados aqui e gravados via `AddressService` (tabela address
 * + address_bond, um endereço por dono).
 */
export const addressSchema = vine.object({
  street: vine.string().trim().minLength(3).maxLength(255),
  number: vine.string().trim().maxLength(20).optional(),
  complement: vine.string().trim().maxLength(120).optional(),
  district: vine.string().trim().maxLength(120).optional(),
  city: vine.string().trim().maxLength(120).optional(),
  state: vine.string().trim().maxLength(80).optional(),
  country: vine.string().trim().maxLength(80).optional(),
  zip: vine.string().trim().maxLength(20).optional(),
})

export const createClinicValidator = vine.compile(
  vine.object({
    name: vine.string().minLength(3).maxLength(120),
    // CNPJ é o dado inicial do cadastro: obrigatório, 14 dígitos e único.
    cnpjf: vine
      .string()
      .maxLength(14)
      .trim()
      .regex(/^\d{14}$/)
      .unique({ table: 'clinics', column: 'cnpjf' }),
    email: vine.string().trim().email().maxLength(255),
    phone: vine.string().maxLength(20).optional(),
    site_page: vine.string().maxLength(255).optional(),
    logo: vine.string().optional(),
    max_users: vine.number().min(1).optional(),
    address: addressSchema.optional(),
  })
)
