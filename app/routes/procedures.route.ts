import router from '@adonisjs/core/services/router'
import ProceduresController from '#controllers/procedures.controller'

const proceduresRoutes = () => {
  router
    .group(() => {
      router.post('/', [ProceduresController, 'create'])
      router.get('/', [ProceduresController, 'list'])
      router.get('/:id', [ProceduresController, 'read'])
      router.put('/:id', [ProceduresController, 'update'])
      router.delete('/:id', [ProceduresController, 'delete'])
    })
    .prefix('procedures')
}

export default proceduresRoutes
