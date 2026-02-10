import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { IUser } from '../interfaces/users.inteface.js'
dotenv.config()

function createToken(user: IUser) {
  const secret = process.env.JWT_SECRET
  const token = jwt.sign(
    {
      _id: user.id.toString(),
      name: user.name,
      username: user.name,
      especialty_area: user.especialty_area,
      access_type: user.access_type,
    },
    secret!,
    { expiresIn: '2 days' }
  )
  return {
    user: {
      _id: user.id,
      name: user.name,
      cnpjf: user.cnpjf,
      especialty_area: user.especialty_area,
      access_type: user.access_type,
    },
    token,
  }
}

export default createToken
