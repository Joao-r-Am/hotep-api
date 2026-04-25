import BaseCrudService from './base-crud-service.js'
import Patient from '#models/PatientModel'
import { createPatientValidator, updatePatientValidator } from '#validators/clinical'

export default class PatientsService extends BaseCrudService {
  constructor() {
    super({
      model: Patient,
      notFoundMessage: 'Patient not found',
      softDeleteColumn: 'deleted_at',
      createValidator: createPatientValidator,
      updateValidator: updatePatientValidator,
      uniqueFields: [{ field: 'document', message: 'Patient document already exists' }],
    })
  }
}
