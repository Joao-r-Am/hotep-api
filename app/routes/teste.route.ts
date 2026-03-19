import router from '@adonisjs/core/services/router'

const teste = () => {
  router.group(() => {
    router.get('alo', () => {return 'alo'})
  }).prefix('teste').use([
      () => import('#middleware/auth_middleware')
  ])
}

export default teste
