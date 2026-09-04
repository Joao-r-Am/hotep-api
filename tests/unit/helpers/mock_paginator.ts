export type PaginatorMeta = {
  total: number
  per_page: number
  current_page: number
  last_page: number
  first_page: number
}

/**
 * Mock do paginator do Lucid (resultado de `query.paginate()`).
 */
export function createPaginatorMock(records: any[] = [], meta: Partial<PaginatorMeta> = {}) {
  return {
    all: () => records,
    getMeta: () => ({
      total: records.length,
      per_page: 10,
      current_page: 1,
      last_page: 1,
      first_page: 1,
      ...meta,
    }),
  }
}

export type PaginatorMock = ReturnType<typeof createPaginatorMock>
