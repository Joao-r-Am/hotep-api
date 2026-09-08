import { createQueryBuilderMock, QueryBuilderMock } from './mock_query_builder.js'
import { createSpy } from './spy.js'

export type RelatedManager = {
  query: ReturnType<typeof createSpy>
  attach: ReturnType<typeof createSpy>
  detach: ReturnType<typeof createSpy>
}

export type RecordMockOptions = {
  /** Atributos retornados por `$attributes` e usados como estado do registro */
  attributes?: Record<string, unknown>
  /** Valor retornado por `serialize()` */
  serialized?: Record<string, unknown>
  /** Fabricante de builders para `.related(rel).query()` */
  relationBuilder?: (relation: string) => QueryBuilderMock
  /** Gerenciador completo de relações para `.related(rel)` */
  related?: (relation: string) => RelatedManager
}

/**
 * Mock de um registro Lucid (instância de modelo).
 *
 * Suporta `serialize`, `merge`, `save`, `delete`, `$attributes`, acesso
 * direto às colunas (ex.: `record.patient_id`, `code.expires_at`) e o
 * gerenciador de relações (`related`) usado em belongsToMany.
 */
export function createRecordMock(options: RecordMockOptions = {}) {
  const attributes: Record<string, unknown> = {
    id: 'record-id',
    ...(options.attributes ?? {}),
  }

  const related = createSpy((relation: string) => {
    if (options.related) {
      return options.related(relation)
    }

    const builder = options.relationBuilder?.(relation) ?? createQueryBuilderMock()
    const manager: RelatedManager = {
      query: createSpy(() => builder),
      attach: createSpy(async () => {}),
      detach: createSpy(async () => {}),
    }
    return manager
  })

  const sync = (payload: Record<string, unknown>) => {
    Object.assign(attributes, payload)
    Object.assign(record, payload)
  }

  const record: any = {
    id: attributes.id,
    $attributes: attributes,
    ...attributes,
    serialize: createSpy(() => options.serialized ?? { ...attributes }),
    merge: createSpy((payload: Record<string, unknown>) => sync(payload)),
    save: createSpy(async () => record),
    delete: createSpy(async () => {}),
    related,
  }

  return record
}

export type RecordMock = ReturnType<typeof createRecordMock>
