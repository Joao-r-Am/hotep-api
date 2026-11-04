import { test } from '@japa/runner'
import ClinicsService from './clinics-services.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'
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
