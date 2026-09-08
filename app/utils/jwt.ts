import jwt, { JwtPayload } from 'jsonwebtoken'
import { AccessType, EspecialtyArea, IUser } from '../interfaces/users.inteface.js'

const SECRET = process.env.JWT_SECRET as string
const EXPIRES_IN = '7d'

const generateToken = (user: IUser) => {
  const payload: {
    name: string
    user_id: string
    email: string
    cnpjf: string
    especialty_area: EspecialtyArea
    access_type: AccessType
  } = {
    email: user.email,
    user_id: user.id,
    name: user.name,
    cnpjf: user.cnpjf,
    especialty_area: user.especialty_area,
    access_type: user.access_type,
  }

  return jwt.sign(payload, SECRET as string, {
    expiresIn: EXPIRES_IN,
    issuer: 'jwt-auth-app',
    audience: 'jwt-auth-users',
  })
}

const verifyToken = (token: string) => {
  try {
    const decode = jwt.verify(token, SECRET as string, {
      issuer: 'jwt-auth-app',
      audience: 'jwt-auth-users',
    }) as JwtPayload
    return decode
  } catch (error) {
    throw { error }
  }
}

const extractTokenFromHeader = (auth: string | undefined) => {
  if (!auth) {
    return null
  }

  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

const Ujwt = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
}

export default Ujwt
