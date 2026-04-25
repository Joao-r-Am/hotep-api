import router from '@adonisjs/core/services/router'
import AppointmentsController from '#controllers/appointments.controller'

const appointmentsRoutes = () => {
  router
    .group(() => {
      router.post('/', [AppointmentsController, 'create'])
      router.get('/', [AppointmentsController, 'list'])
      router.get('/:id', [AppointmentsController, 'read'])
      router.put('/:id', [AppointmentsController, 'update'])
      router.delete('/:id', [AppointmentsController, 'delete'])
    })
    .prefix('appointments')
}

export default appointmentsRoutes
