import router from '@adonisjs/core/services/router'
import ScheduleSlotsController from '#controllers/schedule-slots.controller'

const scheduleSlotsRoutes = () => {
  router
    .group(() => {
      router.post('/', [ScheduleSlotsController, 'create'])
      router.get('/', [ScheduleSlotsController, 'list'])
      router.get('/:id', [ScheduleSlotsController, 'read'])
      router.put('/:id', [ScheduleSlotsController, 'update'])
      router.delete('/:id', [ScheduleSlotsController, 'delete'])
    })
    .prefix('schedule-slots')
}

export default scheduleSlotsRoutes
