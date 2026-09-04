import { createQueryBuilderMock, QueryBuilderMock } from './mock_query_builder.js'
import { createRecordMock, RecordMock } from './mock_record.js'
import { createSpy, SpyFn } from './spy.js'

export type ModelMockOptions = {
  /** Builder base retornado por `model.query()` */
  builder?: QueryBuilderMock
  /** Registro retornado por `model.create()` */
  createdRecord?: RecordMock
  /** Valor retornado por `model.find()` */
  findResult?: any
  /** Valor retornado por `model.findBy()` */
  findByResult?: any
  /** Valor retornado por `model.verifyCredentials()` */
  credentialsResult?: any
}

/**
 * Mock de um model Lucid (lado estático).
 *
 * Expõe `query`, `create`, `find`, `findBy` e `verifyCredentials`,
 * que são as APIs estáticas usadas pelos serviços.
 */
export function createModelMock(options: ModelMockOptions = {}) {
  const model = {
    query: createSpy(() => options.builder ?? createQueryBuilderMock()),
    create: createSpy(
      async (payload: Record<string, unknown>) =>
        options.createdRecord ?? createRecordMock({ attributes: payload })
    ),
    find: createSpy(async (_id: string | number) => options.findResult ?? null),
    findBy: createSpy(async () => options.findByResult ?? null),
    verifyCredentials: createSpy(async () => options.credentialsResult ?? null),
  }

  return model
}

export type ModelMock = ReturnType<typeof createModelMock>

/** Acessa um spy estático do model, tipado. */
export function modelSpy<T extends keyof ModelMock>(model: ModelMock, method: T): SpyFn {
  return model[method] as SpyFn
}

/** Define o builder retornado pelo `model.query()` e devolve o model para encadeamento. */
export function withBuilder(model: ModelMock, builder: QueryBuilderMock) {
  modelSpy(model, 'query').mockImplementation(() => builder)
  return model
}
