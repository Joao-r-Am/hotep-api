import { test } from '@japa/runner'
import ReceitawsService, { type ReceitawsServiceDeps } from './receitaws-service.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'

const RAW_OK = {
  status: 'OK',
  nome: 'Clínica Bem Estar LTDA',
  email: 'contato@clinica.com.br',
  telefone: '51999999999',
  logradouro: 'Rua das Clínicas',
  numero: '123',
  complemento: 'Sala 2',
  bairro: 'Centro',
  municipio: 'Porto Alegre',
  uf: 'RS',
  cep: '90010-000',
}

function makeService(
  fetchImpl: (url: string, init?: { signal?: AbortSignal }) => Promise<{ status: number; json: () => Promise<unknown> }>,
  deps: Partial<ReceitawsServiceDeps> = {},
) {
  return new ReceitawsService({ fetcher: fetchImpl as never, baseUrl: 'https://base.test', ...deps })
}

test.group('ReceitawsService · lookup', () => {
  test('CNPJ inválido (sem 14 dígitos) lança 400 sem pedir à fonte', async ({ assert }) => {
    let called = false
    const service = makeService(async () => {
      called = true
      return { status: 200, json: async () => RAW_OK }
    })

    await expectError(assert, () => service.lookup('123'), {
      status: 400,
    })
    assert.isFalse(called)
  })

  test('sucesso normaliza os dados da Receitaws para o contrato interno', async ({ assert }) => {
    const service = makeService(async (url) => {
      assert.equal(url, 'https://base.test/12345678000195')
      return { status: 200, json: async () => RAW_OK }
    })

    const result = await service.lookup('12345678000195')

    assert.equal(result.cnpjf, '12345678000195')
    assert.equal(result.email, 'contato@clinica.com.br')
    assert.equal(result.phone, '51999999999')
    assert.deepEqual(result.address, {
      street: 'Rua das Clínicas',
      number: '123',
      complement: 'Sala 2',
      district: 'Centro',
      city: 'Porto Alegre',
      state: 'RS',
      country: 'Brasil',
      zip: '90010-000',
    })
  })

  test('cnpj contém apenas dígitos na consulta independente da máscara', async ({ assert }) => {
    const service = makeService(async (url) => {
      assert.match(url, /12345678000195$/)
      return { status: 200, json: async () => RAW_OK }
    })

    const result = await service.lookup('12.345.678/0001-95')

    assert.equal(result.cnpjf, '12345678000195')
  })

  test('erro da source com status != OK lança 404 CNPJ_NOT_FOUND', async ({ assert }) => {
    const service = makeService(async () => ({
      status: 200,
      json: async () => ({ status: 404, message: 'CNPJ não existe' }),
    }))

    await expectError(assert, () => service.lookup('12345678000195'), {
      status: 404,
    })
  })

  test('HTTP 429 da fonte lança 429 CNPJ_LOOKUP_RATE_LIMITED', async ({ assert }) => {
    const service = makeService(async () => ({ status: 429, json: async () => ({}) }))

    await expectError(assert, () => service.lookup('12345678000195'), {
      status: 429,
    })
  })

  test('HTTP 404 na fonte lança 404 CNPJ_NOT_FOUND', async ({ assert }) => {
    const service = makeService(async () => ({ status: 404, json: async () => ({}) }))

    await expectError(assert, () => service.lookup('12345678000195'), { status: 404 })
  })

  test('HTTP genérico >= 400 lança 503 CNPJ_LOOKUP_FAILED', async ({ assert }) => {
    const service = makeService(async () => ({ status: 502, json: async () => ({}) }))

    await expectError(assert, () => service.lookup('12345678000195'), { status: 503 })
  })

  test('falha de rede/timeout lança 503 CNPJ_LOOKUP_FAILED', async ({ assert }) => {
    const service = makeService(async () => {
      throw new Error('network down')
    })

    await expectError(assert, () => service.lookup('12345678000195'), { status: 503 })
  })

  test('dados sem logradouro devolvem address null mas mantêm os outros campos', async ({ assert }) => {
    const service = makeService(async () => ({
      status: 200,
      json: async () => ({ status: 'OK', nome: 'Clínica X' }),
    }))

    const result = await service.lookup('12345678000195')

    assert.equal(result.name, 'Clínica X')
    assert.equal(result.address, null)
  })
})
