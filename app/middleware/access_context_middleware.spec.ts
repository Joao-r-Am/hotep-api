import { test } from '@japa/runner'
import type { Assert } from '@japa/assert'
import AccessContextMiddleware from './access_context_middleware.js'
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js'
import { createRecordMock, RecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createModelMock, ModelMock, asLucidModel } from '../../tests/unit/helpers/model_mocks.js'

const USER_ID = 'user-1'
const CLINIC_ID = 'clinic-1'
const MEMBERSHIP_ID = 'membership-1'

interface CtxFake {
  auth?: {
    user: Record<string, unknown>
    payload?: Record<string, unknown>
    is_authenticated: boolean
  }
  accessContext: Record<string, unknown> | undefined
}

function ctxFake(payload?: Record<string, unknown>): CtxFake {
  return {
    auth: {
      user: { user_id: USER_ID, name: 'João', email: 'joao@x.com' },
      payload: payload ?? {
        user_id: USER_ID,
        clinic_id: CLINIC_ID,
        membership_id: MEMBERSHIP_ID,
      },
      is_authenticated: true,
    },
    accessContext: undefined,
  }
}

function membershipRecord(overrides: Record<string, unknown> = {}, roles: RecordMock[] = []) {
  return createRecordMock({
    attributes: {
      id: MEMBERSHIP_ID,
      clinic_id: CLINIC_ID,
      user_id: USER_ID,
      status: 'active',
      ...overrides,
    },
    related: (relation: string) =>
      relation === 'roles'
        ? ({
            query: () => createQueryBuilderMock({ result: roles }),
            attach: () => {},
            detach: () => {},
          } as any)
        : ({} as any),
  })
}

function roleRecord(permissions: string[], overrides: Record<string, unknown> = {}) {
  return createRecordMock({
    attributes: {
      id: 'role-1',
      name: 'owner',
      ...overrides,
      permissions: permissions.map((code, index) =>
        createRecordMock({ attributes: { id: `p-${index}`, code } })
      ),
    },
  })
}

async function expectApiError(
  assert: Assert,
  executor: () => Promise<unknown>,
  expected: { status: number; code: string }
) {
  let error: any = null
  try {
    await executor()
  } catch (caught) {
    error = caught
  }
  assert.isOk(error, 'Esperava rejeição')
  assert.equal(error.status, expected.status)
  assert.equal(error.code, expected.code)
}

test.group('AccessContextMiddleware', (group) => {
  let membershipModel: ModelMock
  let roleModel: ModelMock
  let middleware: AccessContextMiddleware
  const nextCalls: string[] = []

  group.each.setup(() => {
    membershipModel = createModelMock()
    roleModel = createModelMock()
    middleware = new AccessContextMiddleware(asLucidModel(membershipModel), asLucidModel(roleModel))
    nextCalls.length = 0
  })

  const next = (async () => {
    nextCalls.push('next')
  }) as any

  test('monta accessContext com roles e permissões resolvidas do banco', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord({}, [roleRecord([])]) })
    )
    roleModel.query.mockImplementation(() =>
      createQueryBuilderMock({
        result: [roleRecord(['clinic.read', 'patients.read', 'clinic.read'])],
      })
    )

    const ctx = ctxFake() as any
    await middleware.handle(ctx, next)

    assert.lengthOf(nextCalls, 1)
    assert.equal(ctx.accessContext.userId, USER_ID)
    assert.equal(ctx.accessContext.clinicId, CLINIC_ID)
    assert.equal(ctx.accessContext.membershipId, MEMBERSHIP_ID)
    assert.deepEqual(ctx.accessContext.roles, [{ id: 'role-1', name: 'owner' }])
    assert.deepEqual(ctx.accessContext.permissions, ['clinic.read', 'patients.read'])
  })

  test('rejeita com 403 quando não há clínica no token', async ({ assert }) => {
    const ctx = ctxFake({ user_id: USER_ID }) as any

    await expectApiError(assert, () => middleware.handle(ctx, next), {
      status: 403,
      code: 'CLINIC_CONTEXT_REQUIRED',
    })
    assert.lengthOf(nextCalls, 0)
  })

  test('rejeita com 403 quando o vínculo não existe para o usuário/clínica', async ({ assert }) => {
    membershipModel.query.mockImplementation(() => createQueryBuilderMock({ firstResult: null }))

    const ctx = ctxFake() as any
    await expectApiError(assert, () => middleware.handle(ctx, next), {
      status: 403,
      code: 'MEMBERSHIP_MISMATCH',
    })
  })

  test('rejeita com 403 quando o vínculo está suspenso', async ({ assert }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord({ status: 'suspended' }) })
    )

    const ctx = ctxFake() as any
    await expectApiError(assert, () => middleware.handle(ctx, next), {
      status: 403,
      code: 'MEMBERSHIP_SUSPENDED',
    })
  })

  test('rejeita com 401 quando não autenticado', async ({ assert }) => {
    const ctx = { auth: undefined, accessContext: undefined } as any

    await expectApiError(assert, () => middleware.handle(ctx, next), {
      status: 401,
      code: 'UNAUTHORIZED',
    })
  })

  test('monta accessContext com permissões vazias quando o vínculo não tem papéis', async ({
    assert,
  }) => {
    membershipModel.query.mockImplementation(() =>
      createQueryBuilderMock({ firstResult: membershipRecord() })
    )
    roleModel.query.mockImplementation(() => createQueryBuilderMock({ result: [] }))

    const ctx = ctxFake() as any
    await middleware.handle(ctx, next)

    assert.lengthOf(nextCalls, 1)
    assert.deepEqual(ctx.accessContext.permissions, [])
    assert.deepEqual(ctx.accessContext.roles, [])
  })
})
