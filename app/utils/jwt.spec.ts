import { test } from '@japa/runner'
import jwtLib from 'jsonwebtoken'

let Ujwt: typeof import('./jwt.js').default

test.group('JWT', (group) => {
  group.setup(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-multitenant'
    const module = await import('./jwt.js')
    Ujwt = module.default
  })

  const user = {
    id: 'user-1',
    email: 'joao@x.com',
    name: 'João',
    cnpjf: '12345678901234',
    especialty_area: 'clinic' as never,
    access_type: 2 as never,
  }

  test('token de conta não contém claims de clínica', ({ assert }) => {
    const token = Ujwt.generateToken(user)

    const decoded = Ujwt.verifyToken(token) as Record<string, unknown>
    assert.equal(decoded.user_id, 'user-1')
    assert.isUndefined(decoded.clinic_id)
    assert.isUndefined(decoded.membership_id)
  })

  test('token de seleção contém clinic_id e membership_id', ({ assert }) => {
    const token = Ujwt.generateToken(user, {
      clinic_id: 'clinic-1',
      membership_id: 'membership-1',
    })

    const decoded = Ujwt.verifyToken(token) as Record<string, unknown>
    assert.equal(decoded.clinic_id, 'clinic-1')
    assert.equal(decoded.membership_id, 'membership-1')
  })

  test('claims adulterados com assinatura original são rejeitados', ({ assert }) => {
    const token = Ujwt.generateToken(user, { clinic_id: 'clinic-1', membership_id: 'membership-1' })

    const [header, , signature] = token.split('.')
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(header, 'base64url').toString()) }),
      'utf8'
    ).toString('base64url')
    const forged = `${header}.${forgedPayload}.${signature}`

    let rejected = false
    try {
      Ujwt.verifyToken(forged)
    } catch {
      rejected = true
    }
    assert.isTrue(rejected)
  })

  test('token sem assinatura válida é rejeitado', ({ assert }) => {
    let rejected = false
    try {
      Ujwt.verifyToken('invalido.nao.e.token')
    } catch {
      rejected = true
    }
    assert.isTrue(rejected)
  })

  test('token expirado é rejeitado mesmo com assinatura válida', ({ assert }) => {
    const expired = jwtLib.sign(
      { user_id: 'user-1', email: 'joao@x.com' },
      process.env.JWT_SECRET as string,
      // Espelha issuer/audience do util para o erro ser só a expiração.
      { expiresIn: -60, issuer: 'jwt-auth-app', audience: 'jwt-auth-users' }
    )

    let rejected = false
    try {
      Ujwt.verifyToken(expired)
    } catch {
      rejected = true
    }
    assert.isTrue(rejected)
  })

  test('token emitido carrega issuer e audience configurados', ({ assert }) => {
    const token = Ujwt.generateToken(user)
    const decoded = Ujwt.verifyToken(token) as Record<string, unknown>

    assert.equal(decoded.iss, 'jwt-auth-app')
    assert.equal(decoded.aud, 'jwt-auth-users')
    assert.equal(Number(decoded.exp), Number(decoded.iat) + 7 * 24 * 60 * 60)
  })
})
