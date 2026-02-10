import router from "@adonisjs/core/services/router";
import authRoutes from "./auth.routes.js";
import teste from "./teste.route.js";


const routes = () =>
  router.group(() => {
    authRoutes(),
    teste()
  }).prefix('api/v1')


export default routes
