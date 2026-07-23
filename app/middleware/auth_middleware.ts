import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { JwtPayload } from 'jsonwebtoken'
import Ujwt from '../utils/jwt.js'

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const prefix = '/api/v1'
    const publicRoutes = new Set([
      prefix + '/auth/login',
      prefix + '/auth/register',
      prefix + '/auth/confirm-email',
    ])

    function normalizePath(url: string) {
      const [path] = url.split('?')
      const normalized = path.replace(/\/+$/, '')
      return normalized || '/'
    }

    function isPublicRoute(path: string) {
      return publicRoutes.has(path)
    }

    try {
      const path = normalizePath(ctx.request.url())

      if (isPublicRoute(path)) {
        return await next()
      }

      const authHeader = ctx.request.header('authorization')

      if (!authHeader) {
        return ctx.response.status(401).json({
          status: 'error',
          message: 'Token não fornecido',
          code: 'TOKEN_NOT_PROVIDED',
        })
      }

      const token = Ujwt.extractTokenFromHeader(authHeader)

      if (!token) {
        return ctx.response.status(401).json({
          status: 'error',
          message: 'Formato de token inválido. Use: Bearer <token>',
          code: 'INVALID_TOKEN_FORMAT',
        })
      }

      const decoded = Ujwt.verifyToken(token) as JwtPayload

      ;(ctx as any).auth = {
        user: decoded,
        isAuthenticated: true,
      }

      const output = await next()
      return output
    } catch (error) {
      console.error('Erro na autenticação:', error)

      return ctx.response.status(401).json({
        status: 'error',
        message: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN',
      })
    }
  }
}
