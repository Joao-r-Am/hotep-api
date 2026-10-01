import router from '@adonisjs/core/services/router'
import authRoutes from './auth.routes.js'
import patientsRoutes from './patients.route.js'
import professionalsRoutes from './professionals.route.js'
import proceduresRoutes from './procedures.route.js'
import examsRoutes from './exams.route.js'
import scheduleSlotsRoutes from './schedule-slots.route.js'
import appointmentsRoutes from './appointments.route.js'
import schedulingInvitesRoutes from './scheduling-invites.route.js'
import publicSchedulingRoutes from './public-scheduling.route.js'

const routes = () =>
  router
    .group(() => {
      authRoutes()
      patientsRoutes()
      professionalsRoutes()
      proceduresRoutes()
      examsRoutes()
      scheduleSlotsRoutes()
      appointmentsRoutes()
      schedulingInvitesRoutes()
      publicSchedulingRoutes()
    })
    .prefix('api/v1')

export default routes
