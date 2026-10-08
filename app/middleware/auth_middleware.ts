import type { HttpContext } from '@adonisjs/core/http';
import type { NextFn } from '@adonisjs/core/types/http';
// import { JsonWebTokenError, NotBeforeError, TokenExpiredError, type JwtPayload } from 'jsonwebtoken';
import Ujwt from '../utils/jwt.js';
import User from '#models/UsersModel';
import logger from '@adonisjs/core/services/logger';

export default class AuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const prefix = '/api/v1';
    const publicRoutes = new Set([
      prefix + '/auth/login',
      prefix + '/auth/register',
      prefix + '/auth/confirm-email',
      prefix + '/auth/find-by-cnjpf-username',
    ]);
    const publicPrefixes = [prefix + '/public'];

    function normalizePath(url: string) {
      const [path] = url.split('?');
      const normalized = path.replace(/\/+$/, '');
      return normalized || '/';
    }

    function isPublicRoute(path: string) {
      if (publicRoutes.has(path)) return true;
      return publicPrefixes.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`));
    }

    try {
      const path = normalizePath(ctx.request.url());

      if (isPublicRoute(path)) {
        return await next();
      }

      const authHeader = ctx.request.header('authorization');

      if (!authHeader) {
        return ctx.response.status(401).json({
          status: 'error',
          message: 'Token não fornecido',
          code: 'TOKEN_NOT_PROVIDED',
        });
      }

      const token = Ujwt.extractTokenFromHeader(authHeader);

      if (!token) {
        return ctx.response.status(401).json({
          status: 'error',
          message: 'Formato de token inválido. Use: Bearer <token>',
          code: 'INVALID_TOKEN_FORMAT',
        });
      }

      const decoded = Ujwt.verifyToken(token) as any;

      if (!decoded.user_id) {
        return ctx.response.status(401).json({
          status: 'error',
          message: 'Token inválido. ID do usuário não encontrado.',
          code: 'INVALID_TOKEN_USER_ID',
        });
      }

      const user = await User.findBy('id', decoded.user_id);

      if (!user || !user.active) {
        return ctx.response.status(401).json({
          status: 'error',
          message: 'Usuário não encontrado',
          code: 'USER_NOT_FOUND',
        });
      }

      ctx.auth = {
        user: {
          user_id: String(user.id),
          name: user.name,
          email: user.email,
          cnpjf: user.cnpjf,
          especialty_area: user.especialty_area,
          access_type: user.access_type,
        },
        is_authenticated: true,
      };

      const output = await next();
      return output;
    } catch (error) {
      logger.error({ err: error }, 'error.auth.token');

      const err: unknown = (error as { error?: unknown })?.error ?? error;

      if (err as any) {
        return ctx.response.status(401).json({
          status: 'error',
          message: 'Token expirado',
          code: 'TOKEN_EXPIRED',
        });
      }

      if (err as any) {
        return ctx.response.status(401).json({
          status: 'error',
          message: 'Token inválido',
          code: 'INVALID_TOKEN',
        });
      }

      return ctx.response.status(500).json({
        status: 'error',
        message: 'Erro interno no servidor',
        code: 'INTERNAL_AUTH_ERROR',
      });
    }
  }
}
