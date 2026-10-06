import { DateTime } from 'luxon'
import type { CrudResourceConfig } from './base-crud.interface.js'
import type { LucidModel } from '@adonisjs/lucid/types/model'

export interface IProfessional {
  id: string
  name: string
  document: string
  birth_date?: DateTime
  specialty?: string
  registration_number?: string
  phone?: string
  email?: string
  created_at?: DateTime
  updated_at?: DateTime
  deleted_at?: DateTime
}

export type ProfessionalsServiceDeps = Partial<
  Pick<CrudResourceConfig, 'model' | 'createValidator' | 'updateValidator' | 'uniqueFields'>
> & {
  examModel?: LucidModel
  procedureModel?: LucidModel
  attachExamValidator?: CrudResourceConfig['createValidator']
  attachProcedureValidator?: CrudResourceConfig['createValidator']
}
