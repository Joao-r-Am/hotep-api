import AuthController from '#controllers/auth.controller'
import router from '@adonisjs/core/services/router'

const authRoutes = () => {
  router
    .group(() => {
      router.post('login', [AuthController, 'login'])
      router.post('register', [AuthController, 'register'])
      router.post('confirm-email', [AuthController, 'confirmEmail'])
      // router.get('validate', [AuthController, 'validate'])
    })
    .prefix('auth')
}

export default authRoutes
