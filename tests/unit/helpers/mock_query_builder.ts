import { createSpy, SpyFn } from './spy.js'

export type QueryBuilderMockOptions = {
  /** Resultado do `await builder` e do `.first()` quando `firstResult` não for definido */
  result?: any[]
  /** Resultado do `.first()` */
  firstResult?: any | null
  /** Objeto retornado pelo `.paginate()` */
  paginateResult?: any
}

/**
 * Mock do QueryBuilder fluente do Lucid.
 *
 * Suporta a API encadeada usada pelos serviços (`where`, `whereNull`,
 * `whereNot`, `whereILike`, `orWhere`, `orderBy`, `select`, `from`,
 * `preload`, `paginate`, `first`) e também o comportamento *thenable*
 * (`await query`), como no Lucid real.
 */
export function createQueryBuilderMock(options: QueryBuilderMockOptions = {}) {
  const builder = {
    where: createSpy(() => builder),
    whereNull: createSpy(() => builder),
    whereNot: createSpy(() => builder),
    whereILike: createSpy(() => builder),
    orWhere: createSpy(() => builder),
    whereNotIn: createSpy(() => builder),
    orWhereNull: createSpy(() => builder),
    orderBy: createSpy(() => builder),
    select: createSpy(() => builder),
    from: createSpy(() => builder),
    groupBy: createSpy(() => builder),
    preload: createSpy(() => builder),
    paginate: createSpy(
      async () => options.paginateResult ?? { all: () => [], getMeta: () => ({}) }
    ),
    first: createSpy(async () => {
      if ('firstResult' in options) {
        return options.firstResult
      }
      return options.result?.[0] ?? null
    }),
    then(resolve: (value: any[]) => void) {
      resolve(options.result ?? [])
    },
  }

  return builder
}

export type QueryBuilderMock = ReturnType<typeof createQueryBuilderMock>

/** Acessa um spy específico do builder, tipado. */
export function querySpy<T extends keyof QueryBuilderMock>(
  builder: QueryBuilderMock,
  method: T
): SpyFn {
  return builder[method] as SpyFn
}
