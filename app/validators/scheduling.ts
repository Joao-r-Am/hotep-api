import vine from '@vinejs/vine'

/**
 * Validators do auto-agendamento por link único.
 *
 * Convenção de nomes dos arquivos: `scheduling.ts` em `app/validators/`.
 */

/** Criação de convite (operador autenticado). */
export const createSchedulingInviteValidator = vine.compile(
  vine.object({
    patient_id: vine.string().uuid().optional(),
    professional_id: vine.string().uuid().optional(),
    procedure_ids: vine.array(vine.string().uuid()).distinct().maxLength(50).optional(),
    exam_ids: vine.array(vine.string().uuid()).distinct().maxLength(50).optional(),
    expires_in_days: vine.number().min(1).max(365).optional(),
  })
)

/** Identificação por CPF (etapa `identify`). Sem validação de dígitos aqui: o serviço valida. */
export const identifyPatientValidator = vine.compile(
  vine.object({
    cpf: vine.string().trim().minLength(11).maxLength(14),
  })
)

/** Pré-cadastro de paciente (etapa `register`). */
export const registerPatientValidator = vine.compile(
  vine.object({
    cpf: vine.string().trim().minLength(11).maxLength(14),
    name: vine.string().trim().minLength(2).maxLength(100),
    email: vine.string().trim().maxLength(100).email(),
    phone: vine.string().trim().minLength(8).maxLength(20),
    birth_date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
)

/** Query string do `GET /public/scheduling/:token/procedures`. */
export const proceduresQueryValidator = vine.compile(
  vine.object({
    professional_id: vine.string().uuid(),
  })
)

/** Query string do `GET /public/scheduling/:token/availability`. */
export const availabilityQueryValidator = vine.compile(
  vine.object({
    professional_id: vine.string().uuid(),
    procedure_id: vine.string().uuid().optional(),
    exam_id: vine.string().uuid().optional(),
    from: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
)

/** Criação de agendamento pelo link público. */
export const createAppointmentValidator = vine.compile(
  vine.object({
    professional_id: vine.string().uuid(),
    procedure_id: vine.string().uuid().optional(),
    exam_id: vine.string().uuid().optional(),
    schedule_slot_id: vine.string().uuid(),
    start_time: vine.string(),
    end_time: vine.string(),
    notes: vine.string().trim().maxLength(500).optional(),
  })
)
