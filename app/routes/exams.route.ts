import router from '@adonisjs/core/services/router'
import ExamsController from '#controllers/exams.controller'

const examsRoutes = () => {
  router
    .group(() => {
      router.post('/', [ExamsController, 'create'])
      router.get('/', [ExamsController, 'list'])
      router.get('/:id', [ExamsController, 'read'])
      router.put('/:id', [ExamsController, 'update'])
      router.delete('/:id', [ExamsController, 'delete'])
    })
    .prefix('exams')
}

export default examsRoutes
