import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import AuthService from '#services/users-services'
import createToken from '../utils/create-token.js'
import { IUser } from '../interfaces/users.inteface.js'
import Ujwt from '../utils/jwt.js'


@inject()
export default class AuthController {
  constructor(private authService: AuthService) {}

  async register({ request, response }: HttpContext) {
    try {
      console.log('teste')
      const user = await this.authService.register(request.body() as any)
      const token = createToken(user as IUser)
      response.header('Authorization', `Bearer ${token}`)
      return response.status(200).json({ ...user, token })
    } catch (err) {
      response.json(err)
    }
  }

  async login({ request, response }: HttpContext) {
    try {
      const { identificator, password } = request.body() as any
      const user = await this.authService.login({ identificator, password })
      const token = Ujwt.generateToken(user as IUser)
      response.safeHeader('Authorization', `Bearer ${token}`)
      return response.status(200).json({ ...user, token })
    } catch (err) {
      response.json(err)
    }
  }
}
