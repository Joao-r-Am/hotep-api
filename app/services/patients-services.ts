import BaseCrudService from './base-crud-service.js'
import type { CrudResourceConfig } from '../interfaces/base-crud.interface.js'
import Patient from '#models/PatientModel'
import { createPatientValidator, updatePatientValidator } from '#validators/clinical'

export type PatientsServiceDeps = Partial<
  Pick<CrudResourceConfig, 'model' | 'createValidator' | 'updateValidator' | 'uniqueFields'>
>

export default class PatientsService extends BaseCrudService {
  constructor(deps: PatientsServiceDeps = {}) {
    super({
      model: deps.model ?? Patient,
      notFoundMessage: 'Patient not found',
      softDeleteColumn: 'deleted_at',
      createValidator: deps.createValidator ?? createPatientValidator,
      updateValidator: deps.updateValidator ?? updatePatientValidator,
      uniqueFields: deps.uniqueFields ?? [
        { field: 'document', message: 'Patient document already exists' },
      ],
    })
  }
}
