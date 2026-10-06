import { HttpContext } from '@adonisjs/core/http'
import { LucidModel, ModelObject } from '@adonisjs/lucid/types/model'

export type CompiledValidator = {
  validate(data: Record<string, unknown>): Promise<Record<string, unknown>>
}

export type UniqueField = {
  field: string
  message: string
}

export type CrudServiceError = {
  message: string
  status: number
}

export type CrudListOptions = {
  page: number
  limit: number
  preloads: string[]
  request?: HttpContext['request']
}

export type CrudPaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
  firstPageUrl: string
  lastPageUrl: string
  nextPageUrl: string
  previousPageUrl: string
}

export type CrudListResult = {
  data: ModelObject[]
  meta: CrudPaginationMeta
}

export type CrudResourceConfig = {
  model: LucidModel
  notFoundMessage: string
  orderBy?: string
  softDeleteColumn?: string
  defaultReadPreloads?: string[]
  createValidator?: CompiledValidator
  updateValidator?: CompiledValidator
  uniqueFields?: UniqueField[]
}
