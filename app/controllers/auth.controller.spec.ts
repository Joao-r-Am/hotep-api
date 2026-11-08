import { test } from '@japa/runner'
import AuthController from './auth.controller.js'
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js'
import { createSpy, type SpyFn } from '../../tests/unit/helpers/spy.js'

const LOGIN_BODY = { identificator: 'ana@example.com', password: 'senha123' }
const SELECT_CLINIC_BODY = { membership_id: '5b2ce37a-1111-4c2a-a1a2-000000000001' }

interface MiniCtxSpy {
  status: SpyFn
  json: SpyFn
  safeHeader: SpyFn
}

/**
 * HttpContext mínimo para os spec de controller: `request.body()` e os
 * spies de resposta (status/json/safeHeader) para afirmar o que saiu.
 */
function makeMiniCtx(body: Record<string, unknown> = LOGIN_BODY): {
  ctx: any
  spies: MiniCtxSpy
} {
  const json = createSpy(() => undefined)
  const status = createSpy(() => ({ json }))
  const safeHeader = createSpy(() => undefined)
  const header = createSpy(() => undefined)

  return {
    ctx: {
      request: { body: () => body },
      response: { status, safeHeader, header },
    },
    spies: { status, json, safeHeader },
  }
}

function makeAuthService() {
  return {
    login: createSpy(async () => ({})),
    findById: createSpy(async () => createRecordMock({ attributes: { id: 'user-1' } })),
  }
}

test.group('AuthController', (group) => {
  group.each.setup(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-multitenant'
  })

  test.group('login', () => {
    test('autenticado responde 200 com usuário serializado e Authorization', async ({ assert }) => {
      const userRecord = createRecordMock({
        attributes: { id: 'user-1', email: 'ana@example.com', name: 'Ana', active: true },
        serialized: { id: 'user-1', email: 'ana@example.com', name: 'Ana', active: true },
      })
      const authService = makeAuthService()
      authService.login.mockResolvedValue(userRecord)
      const controller = new AuthController(authService as never, {} as never)
      const { ctx, spies } = makeMiniCtx()

      await controller.login(ctx)

      assert.equal(authService.login.calledTimes(), 1)
      assert.isTrue(authService.login.calledWith('ana@example.com', 'senha123'))
      assert.equal(spies.status.calledTimes(), 1)
      assert.equal((spies.status.calls[0]!.args as unknown[])[0], 200)
      assert.deepEqual((spies.json.calls[0]!.args as unknown[])[0], userRecord.serialized)

      const [headerName, headerValue] = spies.safeHeader.calls[0]!.args
      assert.equal(headerName, 'Authorization')
      assert.isTrue(String(headerValue).startsWith('Bearer '))
    })

    test('usuário inativo responde 403 sem Authorization', async ({ assert }) => {
      const authService = makeAuthService()
      authService.login.mockImplementation(async () => {
        throw { message: 'ERROR.EMAIL_NOT_CONFIRMED', status: 403 }
      })
      const controller = new AuthController(authService as never, {} as never)
      const { ctx, spies } = makeMiniCtx()

      await controller.login(ctx)

      assert.equal(spies.status.calledTimes(), 1)
      assert.equal((spies.status.calls[0]!.args as unknown[])[0], 403)
      assert.equal((spies.json.calls[0]!.args as unknown[])[0], 'ERROR.EMAIL_NOT_CONFIRMED')
      assert.equal(spies.safeHeader.calledTimes(), 0)
    })
  })

  test.group('selectClinic', () => {
    test('sem usuário autenticado responde 401 e não consulta o service', async ({ assert }) => {
      const clinicsService = { selectClinicWithToken: createSpy(async () => ({})) }
      const controller = new AuthController(makeAuthService() as never, clinicsService as never)
      const { ctx, spies } = makeMiniCtx(SELECT_CLINIC_BODY)
      ctx.auth = undefined

      await controller.selectClinic(ctx)

      assert.equal(spies.status.calledTimes(), 1)
      assert.equal((spies.status.calls[0]!.args as unknown[])[0], 401)
      assert.equal(clinicsService.selectClinicWithToken.calledTimes(), 0)
    })

    test('com usuário autenticado delega ao service e responde 200', async ({ assert }) => {
      const selection = {
        token: 'jwt-gerado',
        membership_id: 'membership-1',
        clinic_id: 'clinic-1',
        clinic: { id: 'clinic-1', name: 'Clínica X' },
      }
      const clinicsService = { selectClinicWithToken: createSpy(async () => selection) }
      const controller = new AuthController(makeAuthService() as never, clinicsService as never)
      const { ctx, spies } = makeMiniCtx(SELECT_CLINIC_BODY)
      ctx.auth = { user: { user_id: 'user-1' } }

      await controller.selectClinic(ctx)

      assert.equal(clinicsService.selectClinicWithToken.calledTimes(), 1)
      assert.deepEqual(clinicsService.selectClinicWithToken.calls[0]!.args[0], { user_id: 'user-1' })
      assert.deepEqual(clinicsService.selectClinicWithToken.calls[0]!.args[1], SELECT_CLINIC_BODY)

      assert.equal(spies.status.calledTimes(), 1)
      assert.equal((spies.status.calls[0]!.args as unknown[])[0], 200)
      const [headerName, headerValue] = spies.safeHeader.calls[0]!.args
      assert.equal(headerName, 'Authorization')
      assert.equal(headerValue, 'Bearer jwt-gerado')
      assert.deepEqual((spies.json.calls[0]!.args as unknown[])[0], selection)
    })

    test('erro de domínio do service vira resposta tipada do sendErrorResponse', async ({ assert }) => {
      const { ApiException } = await import('../utils/api-error.js')
      const clinicsService = {
        selectClinicWithToken: createSpy(() => {
          throw new ApiException(403, 'MEMBERSHIP_MISMATCH', 'Vínculo com a clínica inválido para este usuário.', {})
        }),
      }
      const controller = new AuthController(makeAuthService() as never, clinicsService as never)
      const { ctx, spies } = makeMiniCtx(SELECT_CLINIC_BODY)
      ctx.auth = { user: { user_id: 'user-1' } }

      await controller.selectClinic(ctx)

      assert.equal(spies.status.calledTimes(), 1)
      assert.equal((spies.status.calls[0]!.args as unknown[])[0], 403)
      const payload = (spies.json.calls[0]!.args as unknown[])[0] as Record<string, unknown>
      assert.equal(payload.code, 'MEMBERSHIP_MISMATCH')
      assert.equal(payload.message, 'Vínculo com a clínica inválido para este usuário.')
    })
  })
})
