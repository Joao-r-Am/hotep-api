import { DateTime } from 'luxon'
import type {
  LucidModel,
  LucidRow,
  ModelObject,
  ModelQueryBuilderContract,
} from '@adonisjs/lucid/types/model'
import type { StrictValues } from '@adonisjs/lucid/types/querybuilder'
import {
  CompiledValidator,
  CrudListOptions,
  CrudListResult,
  CrudResourceConfig,
  CrudServiceError,
} from '../interfaces/base-crud.interface.js'

export default class BaseCrudService {
  constructor(protected readonly config: CrudResourceConfig) {}

  async create(payload: Record<string, unknown>): Promise<ModelObject> {
    const validated = await this.validatePayload(this.config.createValidator, payload)
    await this.ensureUniqueFields(validated)

    const record = await this.config.model.create(validated)
    return record.serialize()
  }

  async read(id: string, requestedPreloads: string[] = []): Promise<ModelObject> {
    const defaultPreloads = this.config.defaultReadPreloads ?? []
    const record = await this.findByIdOrFail(id, [...defaultPreloads, ...requestedPreloads])

    return record.serialize()
  }

  async list({ page, limit, preloads }: CrudListOptions): Promise<CrudListResult> {
    const query = this.buildBaseQuery().orderBy(this.config.orderBy ?? 'created_at', 'desc')

    for (const preload of preloads) {
      query.preload(preload as never)
    }

    const paginator = await query.paginate(page, limit)

    return {
      data: paginator.all().map((record) => record.serialize()),
      meta: paginator.getMeta(),
    }
  }

  async update(id: string, payload: Record<string, unknown>): Promise<ModelObject> {
    const record = await this.findByIdOrFail(id)
    const validated = await this.validatePayload(this.config.updateValidator, payload)

    await this.ensureUniqueFields(validated, id)

    record.merge(validated)
    await record.save()

    return record.serialize()
  }

  async delete(id: string): Promise<boolean> {
    const record = await this.findByIdOrFail(id)

    if (this.config.softDeleteColumn) {
      record.merge({ [this.config.softDeleteColumn]: DateTime.now() })
      await record.save()
      return true
    }

    await record.delete()
    return true
  }

  protected buildBaseQuery(): ModelQueryBuilderContract<LucidModel, LucidRow> {
    const query = this.config.model.query()

    if (this.config.softDeleteColumn) {
      query.whereNull(this.config.softDeleteColumn)
    }

    return query
  }

  protected async findByIdOrFail(id: string, preloads: string[] = []): Promise<LucidRow> {
    const query = this.buildBaseQuery().where('id', id)

    for (const preload of [...new Set(preloads)]) {
      query.preload(preload as never)
    }

    const record = await query.first()

    if (!record) {
      throw { message: this.config.notFoundMessage, status: 404 } satisfies CrudServiceError
    }

    return record
  }

  private async validatePayload(
    validator: CompiledValidator | undefined,
    payload: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (!validator) {
      return payload
    }

    return validator.validate(payload)
  }

  private async ensureUniqueFields(payload: Record<string, unknown>, currentId?: string) {
    for (const uniqueField of this.config.uniqueFields ?? []) {
      const value = payload[uniqueField.field]

      if (value === undefined || value === null) {
        continue
      }

      const query = this.config.model.query().where(uniqueField.field, value as StrictValues)

      if (this.config.softDeleteColumn) {
        query.whereNull(this.config.softDeleteColumn)
      }

      if (currentId) {
        query.whereNot('id', currentId)
      }

      const existing = await query.first()

      if (existing) {
        throw { message: uniqueField.message, status: 409 } satisfies CrudServiceError
      }
    }
  }
}
