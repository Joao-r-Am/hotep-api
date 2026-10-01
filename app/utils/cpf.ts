/**
 * Remove qualquer caractere não numérico de um CPF/CNPJ.
 * O CPF é armazenado em `patients.document` apenas com dígitos.
 */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Valida os dígitos verificadores de um CPF.
 *
 * Regra: para cada dígito verificador, calcula a soma ponderada
 * (pesos 10..2 e 11..2), multiplica por 10, aplica módulo 11 e
 * compara com o dígito correspondente. CPFs com dígitos repetidos
 * (ex.: `111.111.111-11`) são rejeitados, pois não possuem
 * dígitos verificadores válidos na prática.
 */
export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value)

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false
  }

  const calcVerifierDigit = (offset: number) => {
    let sum = 0
    for (let i = 0; i < offset; i += 1) {
      sum += Number(cpf[i]) * (offset + 1 - i)
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return calcVerifierDigit(9) === Number(cpf[9]) && calcVerifierDigit(10) === Number(cpf[10])
}
