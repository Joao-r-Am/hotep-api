import router from '@adonisjs/core/services/router';
import { middleware } from '#start/kernel';
const PublicSchedulingController = () => import('#controllers/public-scheduling.controller');

const publicSchedulingRoutes = () => {
  router
    .group(() => {
      router.get('/:token', [PublicSchedulingController, 'context']);
      router.get('/:token/professionals', [PublicSchedulingController, 'professionals']);
      router.get('/:token/procedures', [PublicSchedulingController, 'procedures']);
      router.get('/:token/availability', [PublicSchedulingController, 'availability']);
      router.post('/:token/identify', [PublicSchedulingController, 'identify']);
      router.post('/:token/register', [PublicSchedulingController, 'register']);
      router.post('/:token/appointments', [PublicSchedulingController, 'createAppointment']);
      router.get('/:token/appointments/:id/ics', [PublicSchedulingController, 'ics']);
      router.get('/:token/appointments/:id/pdf', [PublicSchedulingController, 'pdf']);
      router.post('/:token/appointments/:id/cancel', [PublicSchedulingController, 'cancel']);
    })
    .prefix('public/scheduling')
    .use([middleware.validateSchedulingToken()]);
};

export default publicSchedulingRoutes;
