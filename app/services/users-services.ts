import User from '#models/UsersModel'
import { inject } from '@adonisjs/core'
import { AccessType, IUser } from '../interfaces/users.inteface.js'
import { registerValidator } from '#validators/auth'

@inject()
export default class AuthService {
  constructor(private userModel: User) {}

  async register(user: Pick<IUser, 'email' | 'name' | 'password' | 'cnpjf' | 'phone' | 'especialty_area' | 'access_type'>) {
    const validate = await registerValidator.validate(user)
    user.access_type = AccessType.BASIC
    const created_user = await User.create(validate)

    created_user.password = undefined!
    // adicionar uma fila para envio de email de confirmação
    return created_user
  }

  async login(auth: { identificator: string; password: string }) {
    const { identificator, password } = auth
    const user = await User.verifyCredentials(identificator, password)
    return user
  }
}
