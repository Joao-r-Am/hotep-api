import type { Assert } from '@japa/assert'

export type ExpectedError = {
  status?: number
  message?: string
}

/**
 * Executa uma função que deve rejeitar (lançar) e valida o erro rejeitado.
 *
 * Os serviços lançam objetos simples `{ message, status }` (não instâncias
 * de `Error`), então `assert.rejects` do Japa não consegue validá-los com
 * construtores — este helper faz a verificação estrutural explicitamente.
 */
export async function expectError(
  assert: Assert,
  executor: () => Promise<unknown>,
  expected: ExpectedError
) {
  let error: any = null

  try {
    await executor()
  } catch (caught) {
    error = caught
  }

  assert.isOk(error, 'Expected the promise to reject')
  if (expected.status !== undefined) {
    assert.equal(error.status, expected.status)
  }
  if (expected.message !== undefined) {
    assert.equal(error.message, expected.message)
  }
}
