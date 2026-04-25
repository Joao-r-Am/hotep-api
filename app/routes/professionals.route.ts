import router from '@adonisjs/core/services/router'
import ProfessionalsController from '#controllers/professionals.controller'

const professionalsRoutes = () => {
  router
    .group(() => {
      router.post('/', [ProfessionalsController, 'create'])
      router.get('/', [ProfessionalsController, 'list'])
      router.get('/:id', [ProfessionalsController, 'read'])
      router.put('/:id', [ProfessionalsController, 'update'])
      router.delete('/:id', [ProfessionalsController, 'delete'])

      router.get('/:id/exams', [ProfessionalsController, 'listExams'])
      router.post('/:id/exams', [ProfessionalsController, 'attachExam'])
      router.delete('/:id/exams/:examId', [ProfessionalsController, 'detachExam'])

      router.get('/:id/procedures', [ProfessionalsController, 'listProcedures'])
      router.post('/:id/procedures', [ProfessionalsController, 'attachProcedure'])
      router.delete('/:id/procedures/:procedureId', [ProfessionalsController, 'detachProcedure'])
    })
    .prefix('professionals')
}

export default professionalsRoutes
