import { randomBytes } from 'node:crypto';

/**
 * Gera um token de 32 caracteres (base64url) via CSPRNG.
 *
 * Usado nos convites de auto-agendamento. O `base64url` é URL-safe e
 * não exige encode adicional ao montar o link `[FRONTEND_URL]/to-schedule/:token`.
 */
export function generateSchedulingToken(): string {
  return randomBytes(24).toString('base64url');
}
