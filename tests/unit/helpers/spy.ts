export type SpyCall = { args: unknown[] }

export type SpyFn<T extends (...args: any[]) => any = (...args: any[]) => any> = {
  (...args: any[]): ReturnType<T>
  calls: SpyCall[]
  mockImplementation(impl: T): void
  mockReturnValue(value: ReturnType<T>): void
  mockResolvedValue(value: Awaited<ReturnType<T>>): void
  mockResolvedValueOnce(value: Awaited<ReturnType<T>>): void
  mockRejectedValue(error: unknown): void
  mockReset(): void
  calledTimes(): number
  calledWith(...args: any[]): boolean
}

/**
 * Spy leve para os testes unitários (substituto de jest.fn()).
 *
 * Registra chamadas e permite definir implementações/valores de retorno.
 * O estado fica em closure para que o spy funcione também quando atribuído
 * e invocado como método de um objeto mock (ex.: `model.create(...)`).
 */
export function createSpy<T extends (...args: any[]) => any = (...args: any[]) => any>(
  impl?: T
): SpyFn<T> {
  let calls: SpyCall[] = []
  let currentImpl: T | undefined = impl
  let onceValues: unknown[] = []

  const spy = function (...args: unknown[]) {
    const onceValue = onceValues.shift()
    calls.push({ args })
    if (onceValue !== undefined) {
      return onceValue
    }
    if (currentImpl) {
      return currentImpl(...args)
    }
    return undefined
  } as SpyFn<T>

  spy.calls = calls

  spy.mockImplementation = (newImpl: T) => {
    currentImpl = newImpl
  }

  spy.mockReturnValue = (value) => {
    currentImpl = (() => value) as T
  }

  spy.mockResolvedValue = (value) => {
    currentImpl = (async () => value) as T
  }

  spy.mockResolvedValueOnce = (value) => {
    onceValues.push(value)
  }

  spy.mockRejectedValue = (error) => {
    currentImpl = (async () => {
      throw error
    }) as T
  }

  spy.mockReset = () => {
    calls = []
    spy.calls = calls
    onceValues = []
    currentImpl = impl
  }

  spy.calledTimes = () => calls.length

  spy.calledWith = (...args) =>
    calls.some(
      (call) =>
        call.args.length === args.length &&
        call.args.every((value, index) => JSON.stringify(value) === JSON.stringify(args[index]))
    )

  return spy
}
