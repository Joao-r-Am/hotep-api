import router from '@adonisjs/core/services/router'
const SchedulingInvitesController = () => import('#controllers/scheduling-invites.controller')

const schedulingInvitesRoutes = () => {
  router
    .group(() => {
      router.post('/', [SchedulingInvitesController, 'create'])
      router.get('/', [SchedulingInvitesController, 'list'])
      router.delete('/:id', [SchedulingInvitesController, 'revoke'])
    })
    .prefix('scheduling-invites')
}

export default schedulingInvitesRoutes
