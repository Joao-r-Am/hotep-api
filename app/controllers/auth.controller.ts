import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import AuthService from '#services/users-services'
import { IUser } from '../interfaces/users.inteface.js'
import Ujwt from '../utils/jwt.js'
import User from '#models/UsersModel'
import logger from '@adonisjs/core/services/logger'

@inject()
export default class AuthController {
  constructor(private authService: AuthService) {}

  private serializeAuthUser(user: User) {
    const serializedUser = user.serialize() as Record<string, unknown>
    return serializedUser
  }

  private handleError(error: any, key: string) {
    const status = error?.status ?? 500
    if (status >= 500) {
      logger.error({ err: error, status }, key)
    } else {
      logger.warn({ status, message: error?.message }, key)
    }
  }

  async register({ request, response }: HttpContext) {
    try {
      const user = await this.authService.register(request.body() as any)
      const token = Ujwt.generateToken(user as IUser)
      response.header('Authorization', `Bearer ${token}`)
      logger.info({ user_id: user.id }, 'success.users.registered')
      return response.status(200).json({ ...user, token })
    } catch (err: any) {
      //TODO: criar interface para erros
      this.handleError(err, 'error.users.register')
      response.status(err?.status ?? 500).json(err.message ?? err.messages)
    }
  }

  async login({ request, response }: HttpContext) {
    try {
      const { identificator, password } = request.body() as any
      const user = await this.authService.login({ identificator, password })
      const token = Ujwt.generateToken(user.serialize() as IUser)
      response.safeHeader('Authorization', `Bearer ${token}`)
      logger.info({ user_id: user.id, email: user.email }, 'success.users.login')
      return response.status(200).json({ ...this.serializeAuthUser(user), token })
    } catch (err: any) {
      this.handleError(err, 'error.users.login')
      response.status(err?.status ?? 500).json(err.message ?? err.messages)
    }
  }

  async confirmEmail({ request, response }: HttpContext) {
    try {
      await this.authService.confirmEmail(request.body().code as any)
      logger.info('success.users.email_confirmed')
      return response.status(201).json({ message: 'success.email_confirmed' })
    } catch (err: any) {
      this.handleError(err, 'error.users.email_confirmed')
      response.status(err?.status ?? 500).json(err.message ?? err.messages)
    }
  }

  async findByCnpjfOrUsername({ request, response }: HttpContext) {
    try {
      const { payload } = request.body() as any
      const res = await this.authService.findByCnpjfOrUsername(payload)
      logger.info({ payload }, 'success.users.found')
      return response.status(200).json(res)
    } catch (err: any) {
      this.handleError(err, 'error.users.find_by_cnpjf_username')
      response.status(err?.status ?? 500).json(err.message ?? err.messages)
    }
  }

  // async validate(ctx: HttpContext) {
  //   const { response } = ctx

  //   try {
  //     const auth = (ctx as AuthenticatedContext).auth

  //     const user = await this.authService.findById(auth!.user!.user_id!)

  //     return response.status(200).json({
  //       valid: true,
  //       user: this.serializeAuthUser(user),
  //     })
  //   } catch (err: any) {
  //     response.status(err?.status ?? 500).json(err.message ?? err.messages)
  //   }
  // }
}
