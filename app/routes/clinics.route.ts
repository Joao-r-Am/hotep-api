import router from '@adonisjs/core/services/router'
const ClinicsController = () => import('#controllers/clinics.controller')

const clinicsRoutes = () => {
  router.group(() => {
    router.get('/me/clinics', [ClinicsController, 'myClinics'])
    router.get('/clinics/:id', [ClinicsController, 'read'])
    router.get('/clinics/:id/members', [ClinicsController, 'members'])
    router.get('/clinics/:id/roles', [ClinicsController, 'roles'])
    router.get('/permissions', [ClinicsController, 'permissions'])
  })
}

export default clinicsRoutes
