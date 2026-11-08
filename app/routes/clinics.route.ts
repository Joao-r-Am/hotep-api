import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
const ClinicsController = () => import('#controllers/clinics.controller')

const clinicsRoutes = () => {
  router.group(() => {
    // Conta nível: lista vínculos (sem exigir clínica ativa).
    router.get('/me/clinics', [ClinicsController, 'myClinics'])
    // Conta nível: consulta de CNPJ para preencher o form de criação.
    router.get('/clinics/cnpj/:cnpj', [ClinicsController, 'lookupCnpj'])
    // Conta nível: clínica local pelo CNPJ (rota de "vincular-se").
    router.get('/clinics/by-cnpj/:cnpj', [ClinicsController, 'findByCnpj'])
    // Conta nível: vínculo direto do usuário logado a uma clínica existente.
    router.post('/clinics/:id/link', [ClinicsController, 'link'])
    // Criação de clínica pelo owner (conta nível, sem clínica ativa).
    router.post('/clinics', [ClinicsController, 'create'])
    // Leitura da clínica: exige apenas vínculo (validado no serviço).
    // Deve vir DEPOIS da rota com param válido (cnpj) para não conflitar.
    router.get('/clinics/:id', [ClinicsController, 'read'])
    // Rotas tenant: exigem token com clínica ativa + permissão.
    router
      .get('/clinics/:id/members', [ClinicsController, 'members'])
      .use(middleware.accessContext())
    router.get('/clinics/:id/roles', [ClinicsController, 'roles']).use(middleware.accessContext())
    router.get('/permissions', [ClinicsController, 'permissions'])
  })
}

export default clinicsRoutes
