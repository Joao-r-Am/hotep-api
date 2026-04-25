import vine from '@vinejs/vine'

export const createPatientValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3),
    document: vine.string().trim().minLength(3),
    birth_date: vine.string().trim().optional(),
    phone: vine.string().trim().optional(),
    email: vine.string().trim().email().optional(),
    observations: vine.string().trim().optional(),
  })
)

export const updatePatientValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).optional(),
    document: vine.string().trim().minLength(3).optional(),
    birth_date: vine.string().trim().optional(),
    phone: vine.string().trim().optional(),
    email: vine.string().trim().email().optional(),
    observations: vine.string().trim().optional(),
  })
)

export const createProfessionalValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3),
    document: vine.string().trim().minLength(3),
    birth_date: vine.string().trim().optional(),
    specialty: vine.string().trim().optional(),
    registration_number: vine.string().trim().optional(),
    phone: vine.string().trim().optional(),
    email: vine.string().trim().email().optional(),
  })
)

export const updateProfessionalValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).optional(),
    document: vine.string().trim().minLength(3).optional(),
    birth_date: vine.string().trim().optional(),
    specialty: vine.string().trim().optional(),
    registration_number: vine.string().trim().optional(),
    phone: vine.string().trim().optional(),
    email: vine.string().trim().email().optional(),
  })
)

export const createProcedureValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3),
    description: vine.string().trim().optional(),
    duration_minutes: vine.number().positive().optional(),
  })
)

export const updateProcedureValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(3).optional(),
    description: vine.string().trim().optional(),
    duration_minutes: vine.number().positive().optional(),
  })
)

export const createExamValidator = vine.compile(
  vine.object({
    code: vine.string().trim().optional(),
    name: vine.string().trim().minLength(3),
    type: vine.string().trim().optional(),
    specialty: vine.string().trim().optional(),
    description: vine.string().trim().optional(),
    preparation_instructions: vine.string().trim().optional(),
    duration_minutes: vine.number().positive().optional(),
    tags: vine.array(vine.string().trim()).optional(),
  })
)

export const updateExamValidator = vine.compile(
  vine.object({
    code: vine.string().trim().optional(),
    name: vine.string().trim().minLength(3).optional(),
    type: vine.string().trim().optional(),
    specialty: vine.string().trim().optional(),
    description: vine.string().trim().optional(),
    preparation_instructions: vine.string().trim().optional(),
    duration_minutes: vine.number().positive().optional(),
    tags: vine.array(vine.string().trim()).optional(),
  })
)

export const createScheduleSlotValidator = vine.compile(
  vine.object({
    professional_id: vine.string().trim(),
    start_time: vine.string().trim(),
    end_time: vine.string().trim(),
    status: vine.string().trim(),
    notes: vine.string().trim().optional(),
  })
)

export const updateScheduleSlotValidator = vine.compile(
  vine.object({
    professional_id: vine.string().trim().optional(),
    start_time: vine.string().trim().optional(),
    end_time: vine.string().trim().optional(),
    status: vine.string().trim().optional(),
    notes: vine.string().trim().optional(),
  })
)

export const createAppointmentValidator = vine.compile(
  vine.object({
    patient_id: vine.string().trim(),
    professional_id: vine.string().trim(),
    exam_id: vine.string().trim().optional(),
    procedure_id: vine.string().trim().optional(),
    schedule_slot_id: vine.string().trim().optional(),
    start_time: vine.string().trim(),
    end_time: vine.string().trim(),
    status: vine.string().trim(),
    notes: vine.string().trim().optional(),
    is_blocked: vine.boolean().optional(),
    closed_at: vine.string().trim().optional(),
  })
)

export const updateAppointmentValidator = vine.compile(
  vine.object({
    patient_id: vine.string().trim().optional(),
    professional_id: vine.string().trim().optional(),
    exam_id: vine.string().trim().optional(),
    procedure_id: vine.string().trim().optional(),
    schedule_slot_id: vine.string().trim().optional(),
    start_time: vine.string().trim().optional(),
    end_time: vine.string().trim().optional(),
    status: vine.string().trim().optional(),
    notes: vine.string().trim().optional(),
    is_blocked: vine.boolean().optional(),
    closed_at: vine.string().trim().optional(),
  })
)

export const attachProfessionalExamValidator = vine.compile(
  vine.object({
    exam_id: vine.string().trim(),
  })
)

export const attachProfessionalProcedureValidator = vine.compile(
  vine.object({
    procedure_id: vine.string().trim(),
  })
)
