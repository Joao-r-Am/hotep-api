import PatientsController from '#controllers/patientes.controller'
import router from '@adonisjs/core/services/router'

const patientsRoutes = () => {
  router
    .group(() => {
      router.post('/', [PatientsController, 'create'])
      router.get('/:id', [PatientsController, 'read'])
      router.put('/:id', [PatientsController, 'update'])
      router.delete('/:id', [PatientsController, 'delete'])
      router.get('/', [PatientsController, 'list'])
    })
    .prefix('patients')
}

export default patientsRoutes
