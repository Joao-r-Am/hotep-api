import { test } from '@japa/runner'
import AddressService from './address-service.js'
import { createQueryBuilderMock, type QueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'

const CLINIC_ID = 'clinic-1'

const ADDRESS_PAYLOAD = {
  street: 'Rua das Clínicas',
  number: '100',
  district: 'Centro',
  city: 'Porto Alegre',
  state: 'RS',
  zip: '90010000',
}

function bondRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bond-1',
    address_id: 'address-1',
    owner_table: 'clinics',
    owner_id: CLINIC_ID,
    ...overrides,
  } as any
}

function transactionHarness(client: Record<string, unknown> = {}) {
  const spy = createSpy(async (callback: (client: Record<string, unknown>) => Promise<unknown>) =>
    callback(client)
  )
  return { spy, db: { transaction: spy } as never }
}

function spyOf(builder: object, name: 'update' | 'delete' | 'where' | 'whereNull') {
  return (builder as unknown as Record<string, unknown>)[name] as unknown as {
    calledTimes(): number
  }
}

test.group('AddressService · whitelist', (group) => {
  let service: AddressService

  group.each.setup(() => {
    service = new AddressService({
      addressModel: asLucidModel(createModelMock()),
      addressBondModel: asLucidModel(createModelMock()),
    })
  })

  test('setFor rejeita donos fora da whitelist com 400', async ({ assert }) => {
    await expectError(assert, () => service.setFor('users', 'user-1', ADDRESS_PAYLOAD), {
      status: 400,
    })
  })

  test('getFor e remove também rejeitam donos fora da whitelist', async ({ assert }) => {
    await expectError(assert, () => service.getFor('bananas', 'x'), { status: 400 })
    await expectError(assert, () => service.remove('exams', 'x'), { status: 400 })
  })

  test('setFor devolve null quando o payload não tem street', async ({ assert }) => {
    const result = await service.setFor('clinics', CLINIC_ID, {})

    assert.equal(result, null)
  })

  test('payload é normalizado: vazios viram null e país tem default', ({ assert }) => {
    const normalized = AddressService.normalizePayload({ street: '  Av. Brasil ', number: ' ', country: '' })

    assert.equal(normalized!.street, 'Av. Brasil')
    assert.equal(normalized!.number, null)
    assert.equal(normalized!.country, 'Brasil')
  })
})

test.group('AddressService · setFor', (group) => {
  let service: AddressService
  let addressModel: ModelMock & { query: any; create: any }
  let bondModelMock: ModelMock & { query: any; create: any }
  let addressQuery: QueryBuilderMock

  group.each.setup(() => {
    addressModel = createModelMock() as never
    bondModelMock = createModelMock() as never
    addressQuery = createQueryBuilderMock()
    addressModel.query.mockImplementation(() => addressQuery)
    bondModelMock.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))
    service = new AddressService({
      addressModel: asLucidModel(addressModel as never),
      addressBondModel: asLucidModel(bondModelMock as never),
      db: transactionHarness().db,
    })
  })

  test('cria address + bond quando o dono não tem endereço', async ({ assert }) => {
    addressModel.create = createSpy(async (payload: Record<string, unknown>) => payload)
    bondModelMock.create = createSpy(async (payload: Record<string, unknown>) => payload)

    const result = await service.setFor('clinics', CLINIC_ID, ADDRESS_PAYLOAD)

    assert.equal(addressModel.create.calledTimes(), 1)
    const addressCreated = addressModel.create.calls[0]!.args[0] as Record<string, unknown>
    assert.equal(addressCreated.street, 'Rua das Clínicas')
    assert.ok(addressCreated.id)

    assert.equal(bondModelMock.create.calledTimes(), 1)
    const bondCreated = bondModelMock.create.calls[0]!.args[0] as Record<string, unknown>
    assert.equal(bondCreated.owner_table, 'clinics')
    assert.equal(bondCreated.owner_id, CLINIC_ID)
    assert.equal(String(bondCreated.address_id), String(addressCreated.id))

    assert.equal(result!.street, 'Rua das Clínicas')
    assert.equal(result!.country, 'Brasil')
    assert.equal(result!.id, String(addressCreated.id))
  })

  test('atualiza o address existente via bond, sem criar outro', async ({ assert }) => {
    bondModelMock.query.mockImplementation(() => createQueryBuilderMock({ firstResult: bondRecord() }))

    const result = await service.setFor('clinics', CLINIC_ID, { ...ADDRESS_PAYLOAD, city: 'São Paulo' })

    assert.equal(addressModel.create.calledTimes(), 0)
    assert.equal(bondModelMock.create.calledTimes(), 0)
    assert.isTrue(addressQuery.where.calledWith('id', 'address-1'))
    assert.equal(spyOf(addressQuery, 'update').calledTimes(), 1)
    assert.equal(result!.city, 'São Paulo')
    assert.equal(result!.id, 'address-1')
  })

  test('usa o client externo da transação do chamador quando informado', async ({ assert }) => {
    addressModel.create = createSpy(async (payload: Record<string, unknown>) => payload)
    const client = { external: true }

    await service.setFor('clinics', CLINIC_ID, ADDRESS_PAYLOAD, { client })

    const createOptions = addressModel.create.calls[0]!.args[1] as Record<string, unknown>
    assert.equal(createOptions.client, client)
    const bondQueryOptions = bondModelMock.query.calls[0]!.args[0] as Record<string, unknown>
    assert.equal(bondQueryOptions.client, client)
  })

  test('usa a própria transação do db quando não há client externo', async ({ assert }) => {
    addressModel.create = createSpy(async (payload: Record<string, unknown>) => payload)
    const harness = transactionHarness()
    service = new AddressService({
      addressModel: asLucidModel(addressModel as never),
      addressBondModel: asLucidModel(bondModelMock as never),
      db: harness.db,
    })

    await service.setFor('clinics', CLINIC_ID, ADDRESS_PAYLOAD)

    assert.equal(harness.spy.calledTimes(), 1)
  })
})

test.group('AddressService · getFor', (group) => {
  let service: AddressService
  let addressModel: ModelMock & { query: any }
  let bondModelMock: ModelMock & { query: any }

  group.each.setup(() => {
    addressModel = createModelMock() as never
    bondModelMock = createModelMock() as never
    service = new AddressService({
      addressModel: asLucidModel(addressModel as never),
      addressBondModel: asLucidModel(bondModelMock as never),
    })
  })

  test('retorna o endereço apontado pelo bond do dono', async ({ assert }) => {
    bondModelMock.query.mockImplementation(() => createQueryBuilderMock({ firstResult: bondRecord() }))
    addressModel.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: {
          id: 'address-1',
          street: 'Rua das Clínicas',
          number: '100',
          complement: null,
          district: 'Centro',
          city: 'Porto Alegre',
          state: 'RS',
          country: 'Brasil',
          zip: '90010000',
        },
      })
    )

    const result = await service.getFor('clinics', CLINIC_ID)

    assert.equal(result!.street, 'Rua das Clínicas')
    assert.equal(result!.city, 'Porto Alegre')
    assert.deepEqual(Object.keys(result!).sort(), [
      'city',
      'complement',
      'country',
      'district',
      'id',
      'number',
      'state',
      'street',
      'zip',
    ])
  })

  test('retorna null quando o dono não tem bond (sem consultar address)', async ({ assert }) => {
    bondModelMock.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    const result = await service.getFor('clinics', CLINIC_ID)

    assert.equal(result, null)
    assert.equal(addressModel.query.calledTimes(), 0)
  })

  test('retorna null quando a address do bond está removida', async ({ assert }) => {
    bondModelMock.query.mockImplementation(() => createQueryBuilderMock({ firstResult: bondRecord() }))
    const addressQuery = createQueryBuilderMock()
    addressModel.query.mockImplementation(() => addressQuery)

    const result = await service.getFor('clinics', CLINIC_ID)

    assert.equal(result, null)
    assert.isTrue(addressQuery.whereNull.calledWith('deleted_at'))
  })
})

test.group('AddressService · remove', (group) => {
  let service: AddressService
  let addressModel: ModelMock & { query: any }
  let bondModelMock: ModelMock & { query: any }

  group.each.setup(() => {
    addressModel = createModelMock() as never
    bondModelMock = createModelMock() as never
    service = new AddressService({
      addressModel: asLucidModel(addressModel as never),
      addressBondModel: asLucidModel(bondModelMock as never),
      db: transactionHarness().db,
    })
  })

  test('remove o bond e marca o address com deleted_at', async ({ assert }) => {
    const bondLookUp = createQueryBuilderMock({ firstResult: bondRecord() })
    const bondDeleteQuery = createQueryBuilderMock()
    const addressDeleteQuery = createQueryBuilderMock()
    let bondCall = 0
    bondModelMock.query.mockImplementation(() => (bondCall++ === 0 ? bondLookUp : bondDeleteQuery))
    addressModel.query.mockImplementation(() => addressDeleteQuery)

    const result = await service.remove('clinics', CLINIC_ID)

    assert.isTrue(result)
    assert.isTrue(spyOf(bondDeleteQuery, 'delete').calledTimes() === 1)
    assert.equal(spyOf(addressDeleteQuery, 'update').calledTimes(), 1)
    const updatedFields = addressDeleteQuery.update as unknown as { calls: { args: unknown[] }[] }
    assert.isOk('deleted_at' in (updatedFields.calls[0]!.args[0] as Record<string, unknown>))
  })

  test('retorna false quando o dono não tem endereço, sem mexer no address', async ({ assert }) => {
    bondModelMock.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))
    const addressQuery = createQueryBuilderMock()
    addressModel.query.mockImplementation(() => addressQuery)

    const result = await service.remove('clinics', CLINIC_ID)

    assert.isFalse(result)
    assert.equal(spyOf(addressQuery, 'update').calledTimes(), 0)
  })
})
