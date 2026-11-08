import { test } from '@japa/runner'
import ClinicsService from './clinics-services.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
import { createSpy } from '../../tests/unit/helpers/spy.js'
import { expectError } from '../../tests/unit/helpers/expect_error.js'

const USER_ID = 'user-1'
const CLINIC_ID = 'clinic-1'

function membershipRecord(overrides: Record<string, unknown> = {}) {
  return createRecordMock({
    attributes: {
      id: 'membership-1',
      clinic_id: CLINIC_ID,
      user_id: USER_ID,
      status: 'active',
      clinic: createRecordMock({ attributes: { id: CLINIC_ID, name: 'Clínica X' } }),
      roles: [createRecordMock({ attributes: { id: 'role-1', name: 'owner' } })],
      ...overrides,
    },
  })
}

test.group('ClinicsService', (group) => {
  let clinicModel: ModelMock
  let membershipModel: ModelMock
  let roleModel: ModelMock
  let permissionModel: ModelMock
  let service: ClinicsService

  group.each.setup(() => {
    clinicModel = createModelMock()
    membershipModel = createModelMock()
    roleModel = createModelMock()
    permissionModel = createModelMock()
    service = new ClinicsService({
      clinicModel: asLucidModel(clinicModel),
      membershipModel: asLucidModel(membershipModel),
      roleModel: asLucidModel(roleModel),
      permissionModel: asLucidModel(permissionModel),
    })
  })

  test('listMyClinics retorna clínicas, status e papéis do usuário', async ({ assert }) => {
    const builder = createQueryBuilderMock({ result: [membershipRecord()] })
    membershipModel.query.mockImplementation(() => builder)

    const result = await service.listMyClinics(USER_ID)

    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].membership_id, 'membership-1')
    assert.equal(result.data[0].status, 'active')
    assert.equal(result.data[0].clinic.name, 'Clínica X')
    assert.deepEqual(
      result.data[0].roles.map((role: any) => role.name),
      ['owner']
    )
    assert.isTrue(builder.where.calledWith('user_id', USER_ID))
    assert.isTrue(builder.whereNull.calledWith('deleted_at'))
  })

  test('listMyClinics retorna lista vazia para usuário sem vínculo', async ({ assert }) => {
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ result: [] }))

    const result = await service.listMyClinics(USER_ID)

    assert.deepEqual(result.data, [])
  })

  test('readClinic retorna a clínica com o membership para membro ativo', async ({ assert }) => {
    const membership = membershipRecord()
    const clinic = createRecordMock({
      attributes: { id: CLINIC_ID, name: 'Clínica X' },
      serialized: { id: CLINIC_ID, name: 'Clínica X' },
    })
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membership })
    )
    clinicModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: clinic }))

    const result = await service.readClinic(CLINIC_ID, USER_ID)

    assert.equal(result.id, CLINIC_ID)
    assert.equal(result.membership.status, 'active')
  })

  test('readClinic lança 403 quando o usuário não tem vínculo', async ({ assert }) => {
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.readClinic(CLINIC_ID, USER_ID), {
      status: 403,
      message: 'Usuário sem vínculo ativo com a clínica.',
    })
    assert.equal(clinicModel.query.calledTimes(), 0)
  })

  test('readClinic lança 403 quando o vínculo está suspenso', async ({ assert }) => {
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.readClinic(CLINIC_ID, 'user-suspenso'), {
      status: 403,
    })
  })

  test('readClinic lança 404 quando a clínica não existe', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord() })
    )
    clinicModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.readClinic(CLINIC_ID, USER_ID), {
      status: 404,
      message: 'Clínica não encontrada.',
    })
  })

  test('listMembers exige vínculo ativo antes de listar', async ({ assert }) => {
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.listMembers(CLINIC_ID, USER_ID), {
      status: 403,
      message: 'Usuário sem vínculo ativo com a clínica.',
    })
    assert.equal(membershipModel.query.calledTimes(), 1)
  })

  test('listMembers retorna membros com usuário e papéis', async ({ assert }) => {
    const member = membershipRecord({
      user: createRecordMock({ attributes: { id: USER_ID, name: 'João' } }),
    })
    const listBuilder = createQueryBuilderMock({ result: [member] })
    let queryCalls = 0
    membershipModel.query.mockImplementation(() => {
      queryCalls++
      return queryCalls === 1
        ? createQueryBuilderMock({ firstResult: membershipRecord() })
        : listBuilder
    })

    const result = await service.listMembers(CLINIC_ID, USER_ID)

    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].user.name, 'João')
    assert.deepEqual(
      result.data[0].roles.map((role: any) => role.name),
      ['owner']
    )
    assert.isTrue(listBuilder.where.calledWith('clinic_id', CLINIC_ID))
  })

  test('listRoles exige vínculo ativo e filtra papéis da clínica', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord() })
    )
    const roleRecord = createRecordMock({
      attributes: {
        id: 'role-1',
        clinic_id: null,
        name: 'owner',
        is_system: true,
        permissions: [createRecordMock({ attributes: { id: 'p1', code: 'clinic.read' } })],
      },
    })
    const roleBuilder = createQueryBuilderMock({ result: [roleRecord] })
    roleModel.query.mockImplementation(() => roleBuilder)

    const result = await service.listRoles(CLINIC_ID, USER_ID)

    assert.lengthOf(result.data, 1)
    assert.equal(result.data[0].name, 'owner')
    assert.isTrue(result.data[0].is_system)
    assert.equal(result.data[0].permissions[0].code, 'clinic.read')
    assert.isTrue(roleBuilder.whereNull.calledWith('deleted_at'))
  })

  test('listRoles lança 403 para usuário sem vínculo', async ({ assert }) => {
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.listRoles(CLINIC_ID, USER_ID), { status: 403 })
    assert.equal(roleModel.query.calledTimes(), 0)
  })

  test('listPermissions retorna o catálogo ordenado por código', async ({ assert }) => {
    const builder = createQueryBuilderMock({
      result: [
        createRecordMock({ attributes: { id: 'p1', code: 'appointments.read' } }),
        createRecordMock({ attributes: { id: 'p2', code: 'patients.read' } }),
      ],
    })
    permissionModel.query.mockImplementation(() => builder)

    const result = await service.listPermissions()

    assert.lengthOf(result.data, 2)
    assert.equal(result.data[0].code, 'appointments.read')
    assert.isTrue(builder.orderBy.calledWith('code', 'asc'))
  })
})

test.group('ClinicsService · findLocalByCnpj', (group) => {
  let clinicModel: ModelMock
  let service: ClinicsService

  group.each.setup(() => {
    clinicModel = createModelMock()
    service = new ClinicsService({ clinicModel: asLucidModel(clinicModel) })
  })

  test('retorna a clínica local pelo CNPJ, normalizado para 14 dígitos', async ({ assert }) => {
    const clinic = createRecordMock({
      attributes: { id: CLINIC_ID, cnpjf: '12345678000195' },
      serialized: { id: CLINIC_ID, name: 'Clínica X', cnpjf: '12345678000195' },
    })
    const builder = createQueryBuilderMock({ firstResult: clinic })
    clinicModel.query.mockImplementation(() => builder)

    const result = await service.findLocalByCnpj('12.345.678/0001-95')

    assert.equal(result.id, CLINIC_ID)
    assert.equal(result.name, 'Clínica X')
    assert.isTrue(builder.where.calledWith('cnpjf', '12345678000195'))
    assert.isTrue(builder.whereNull.calledWith('deleted_at'))
  })

  test('rejeita CNPJ com menos de 14 dígitos', async ({ assert }) => {
    await expectError(assert, () => service.findLocalByCnpj('12345678'), {
      status: 400,
      code: 'CNPJ_INVALID',
    })
    assert.equal(clinicModel.query.calledTimes(), 0)
  })

  test('lança 404 quando nenhuma clínica local usa o CNPJ', async ({ assert }) => {
    clinicModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.findLocalByCnpj('12345678000195'), {
      status: 404,
      code: 'CLINIC_NOT_FOUND',
    })
  })
})

test.group('ClinicsService · linkUser', (group) => {
  let clinicModel: ModelMock
  let membershipModel: ModelMock
  let roleModel: ModelMock
  let transactionSpy: any
  let trxInsert: any
  let service: ClinicsService

  group.each.setup(() => {
    clinicModel = createModelMock()
    membershipModel = createModelMock()
    roleModel = createModelMock()
    trxInsert = createSpy(() => ({ table: async () => {} }))
    transactionSpy = createSpy(async (callback: (client: any) => Promise<unknown>) =>
      callback({ insert: trxInsert })
    )
    service = new ClinicsService({
      clinicModel: asLucidModel(clinicModel),
      membershipModel: asLucidModel(membershipModel),
      roleModel: asLucidModel(roleModel),
      db: { transaction: transactionSpy } as any,
    })
  })

  test('vincula o usuário com membership ativa e papel operator em transação', async ({ assert }) => {
    const clinic = createRecordMock({
      attributes: { id: CLINIC_ID },
      serialized: { id: CLINIC_ID, name: 'Clínica Existente', cnpjf: '12345678000195' },
    })
    clinicModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: clinic }))
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))
    roleModel.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: createRecordMock({
          attributes: { id: 'role-operator', name: 'operator', is_system: true },
        }),
      })
    )
    membershipModel.create.mockImplementation(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload })
    )

    const result = await service.linkUser(CLINIC_ID, USER_ID)

    assert.equal(result.membership.status, 'active')
    assert.deepEqual(
      result.roles.map((role: any) => role.name),
      ['operator']
    )
    assert.equal(result.clinic.name, 'Clínica Existente')
    const membershipPayload = membershipModel.create.calls[0]!.args[0] as Record<string, unknown>
    assert.equal(membershipPayload.clinic_id, CLINIC_ID)
    assert.equal(membershipPayload.user_id, USER_ID)
    assert.equal(transactionSpy.calledTimes(), 1)
    assert.equal(membershipModel.create.calledTimes(), 1)
    assert.deepEqual(trxInsert.calls[0]!.args[0], {
      membership_id: result.membership.id,
      role_id: 'role-operator',
    })
  })

  test('lança 404 quando a clínica não existe', async ({ assert }) => {
    clinicModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.linkUser('inexistente', USER_ID), {
      status: 404,
      code: 'CLINIC_NOT_FOUND',
    })
    assert.equal(membershipModel.query.calledTimes(), 0)
    assert.equal(membershipModel.create.calledTimes(), 0)
  })

  test('lança 409 quando o usuário já tem vínculo com a clínica', async ({ assert }) => {
    clinicModel.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: createRecordMock({ attributes: { id: CLINIC_ID } }),
      })
    )
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord() })
    )

    await expectError(assert, () => service.linkUser(CLINIC_ID, USER_ID), {
      status: 409,
      code: 'MEMBER_ALREADY_LINKED',
    })
    assert.equal(roleModel.query.calledTimes(), 0)
    assert.equal(transactionSpy.calledTimes(), 0)
    assert.equal(membershipModel.create.calledTimes(), 0)
  })

  test('lança 500 quando o papel operator não está catalogado', async ({ assert }) => {
    clinicModel.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: createRecordMock({ attributes: { id: CLINIC_ID } }),
      })
    )
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))
    roleModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.linkUser(CLINIC_ID, USER_ID), {
      status: 500,
      message: 'Papel operator não catalogado no sistema.',
    })
    assert.equal(membershipModel.create.calledTimes(), 0)
    assert.equal(transactionSpy.calledTimes(), 0)
  })
})

test.group('ClinicsService · selectClinic', (group) => {
  let membershipModel: ModelMock
  let service: ClinicsService

  group.each.setup(() => {
    membershipModel = createModelMock()
    service = new ClinicsService({ membershipModel: asLucidModel(membershipModel) })
  })

  test('selectClinic retorna o contexto do vínculo ativo próprio', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord() })
    )

    const result = await service.selectClinic(USER_ID, 'membership-1')

    assert.equal(result.membership_id, 'membership-1')
    assert.equal(result.clinic_id, CLINIC_ID)
    assert.equal(result.status, 'active')
    assert.equal(result.clinic.name, 'Clínica X')
    assert.equal(membershipModel.query.calledTimes(), 1)
  })

  test('selectClinic lança 404 quando o vínculo não existe', async ({ assert }) => {
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.selectClinic(USER_ID, 'inexistente'), {
      status: 404,
      message: 'Vínculo com a clínica não encontrado.',
    })
  })

  test('selectClinic lança 403 para vínculo de outro usuário', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord({ user_id: 'outro-usuario' }) })
    )

    await expectError(assert, () => service.selectClinic(USER_ID, 'membership-1'), {
      status: 403,
      message: 'Vínculo com a clínica inválido para este usuário.',
    })
  })

  test('selectClinic lança 403 quando o vínculo está suspenso', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord({ status: 'suspended' }) })
    )

    await expectError(assert, () => service.selectClinic(USER_ID, 'membership-1'), { status: 403 })
  })
})

test.group('ClinicsService · selectClinicWithToken', (group) => {
  let membershipModel: ModelMock
  let selectClinicValidator: ReturnType<typeof createSpy>
  let generateToken: ReturnType<typeof createSpy>
  let service: ClinicsService

  const account = {
    user_id: USER_ID,
    name: 'João',
    email: 'joao@x.com',
    cnpjf: '12345678901234',
    especialty_area: 'clinic' as never,
    access_type: 2 as never,
  }

  group.each.setup(() => {
    membershipModel = createModelMock()
    selectClinicValidator = createSpy(async (payload: Record<string, unknown>) => payload)
    generateToken = createSpy(() => 'jwt-token-gerado')
    service = new ClinicsService({
      membershipModel: asLucidModel(membershipModel),
      selectClinicValidator: { validate: selectClinicValidator as any },
      jwt: { generateToken: generateToken as never, verifyToken: createSpy(() => ({})) as never },
    })
  })

  test('valida o body e emite token com o contexto do vínculo ativo próprio', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord() })
    )

    const result = await service.selectClinicWithToken(account as never, { membership_id: 'membership-1' })

    assert.equal(result.token, 'jwt-token-gerado')
    assert.equal(result.membership_id, 'membership-1')
    assert.equal(result.clinic_id, CLINIC_ID)
    assert.equal(result.clinic.name, 'Clínica X')
    assert.isTrue(selectClinicValidator.calledWith({ membership_id: 'membership-1' }))
    assert.equal(generateToken.calledTimes(), 1)
    const [user, clinicContext] = generateToken.calls[0]!.args as [Record<string, unknown>, Record<string, unknown>]
    assert.equal(user.id, USER_ID)
    assert.equal(user.email, account.email)
    assert.deepEqual(clinicContext, { clinic_id: CLINIC_ID, membership_id: 'membership-1' })
  })

  test('propaga 404 do vínculo inexistente validando o body antes', async ({ assert }) => {
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.selectClinicWithToken(account as never, { membership_id: 'inexistente' }), {
      status: 404,
      message: 'Vínculo com a clínica não encontrado.',
    })
    assert.isTrue(selectClinicValidator.calledTimes() === 1)
    assert.equal(generateToken.calledTimes(), 0)
  })

  test('propaga 403 para vínculo alheio sem emitir token', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord({ user_id: 'outro-usuario' }) })
    )

    await expectError(assert, () => service.selectClinicWithToken(account as never, { membership_id: 'membership-1' }), {
      status: 403,
    })
    assert.equal(generateToken.calledTimes(), 0)
  })
})

test.group('ClinicsService · createClinic', (group) => {
  let clinicModel: ModelMock
  let membershipModel: ModelMock
  let roleModel: ModelMock
  let addressService: { setFor: ReturnType<typeof createSpy> }
  let transactionSpy: any
  let trxInsert: any
  let service: ClinicsService

  group.each.setup(() => {
    clinicModel = createModelMock()
    membershipModel = createModelMock()
    roleModel = createModelMock()
    addressService = { setFor: createSpy(async () => null) }
    trxInsert = createSpy(() => ({ table: async () => {} }))
    transactionSpy = createSpy(async (callback: (client: any) => Promise<unknown>) =>
      callback({ insert: trxInsert })
    )
    service = new ClinicsService({
      clinicModel: asLucidModel(clinicModel),
      membershipModel: asLucidModel(membershipModel),
      roleModel: asLucidModel(roleModel),
      addressService: addressService as never,
      createClinicValidator: {
        validate: async (data: Record<string, unknown>) => ({ name: data.name, ...data }),
      },
      db: { transaction: transactionSpy } as any,
    })
  })

  test('createClinic cria clínica, membership owner e vincula o papel', async ({ assert }) => {
    roleModel.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: createRecordMock({
          attributes: { id: 'role-owner', name: 'owner', is_system: true },
        }),
      })
    )
    clinicModel.create.mockImplementation(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload, serialized: { ...payload } })
    )
    membershipModel.create.mockImplementation(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload })
    )

    const result = await service.createClinic(USER_ID, { name: 'Minha Clínica' })

    assert.equal(result.membership.status, 'active')
    assert.equal(result.roles[0].name, 'owner')
    assert.equal(result.clinic.name, 'Minha Clínica')
    assert.ok(result.clinic.id)
    assert.equal(result.address, null)
    assert.equal(transactionSpy.calledTimes(), 1)
    assert.equal(clinicModel.create.calledTimes(), 1)
    assert.equal(membershipModel.create.calledTimes(), 1)
  })

  test('createClinic grava o endereço do payload nas tabelas address dentro da transação', async ({ assert }) => {
    roleModel.query.mockImplementation(() =>
      createQueryBuilderMock({
        firstResult: createRecordMock({
          attributes: { id: 'role-owner', name: 'owner', is_system: true },
        }),
      })
    )
    clinicModel.create.mockImplementation(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload, serialized: { name: payload.name } })
    )
    membershipModel.create.mockImplementation(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: payload })
    )
    addressService.setFor = createSpy(async (_t: unknown, _i: unknown, payload: unknown) => payload)

    const addressPayload = { street: 'Rua das Clínicas', number: '100', city: 'Porto Alegre' }
    const result = await service.createClinic(USER_ID, {
      name: 'Minha Clínica',
      cnpjf: '12345678000195',
      email: 'contato@clinica.com',
      address: addressPayload,
    })

    assert.equal(addressService.setFor.calledTimes(), 1)
    const [ownerTable, ownerId, address, opts] = addressService.setFor.calls[0]!.args as [
      string,
      string,
      unknown,
      Record<string, unknown>,
    ]
    assert.equal(ownerTable, 'clinics')
    assert.ok(ownerId)
    assert.deepEqual(address, addressPayload)
    assert.isOk(opts.client)

    // O endereço não pode vazar como coluna de clinics
    const clinicCreatePayload = clinicModel.create.calls[0]!.args[0] as Record<string, unknown>
    assert.notInclude(Object.keys(clinicCreatePayload), 'address')
    assert.equal(clinicCreatePayload.cnpjf, '12345678000195')
    assert.equal(result.address, addressPayload as unknown)
  })

  test('createClinic lança 500 quando o papel owner não está catalogado', async ({ assert }) => {
    roleModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    await expectError(assert, () => service.createClinic(USER_ID, { name: 'Minha Clínica' }), {
      status: 500,
      message: 'Papel owner não catalogado no sistema.',
    })
    assert.equal(clinicModel.create.calledTimes(), 0)
    assert.equal(membershipModel.create.calledTimes(), 0)
  })
})
