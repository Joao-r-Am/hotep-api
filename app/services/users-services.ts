import User from '#models/UsersModel'
import { inject } from '@adonisjs/core'
import { AccessType, IUser } from '../interfaces/users.inteface.js'
import { registerValidator } from '#validators/auth'
import emailsQueue from '../queues/auth/emails.queue.js'
import Code from '#models/CodesModel'
import { DateTime } from 'luxon'

@inject()
export default class AuthService {
  async register(
    user: Pick<
      IUser,
      'email' | 'name' | 'password' | 'cnpjf' | 'phone' | 'especialty_area' | 'access_type'
    >
  ) {
    const validate = await registerValidator.validate(user)
    user.access_type = AccessType.BASIC
    const created_user = await User.create({ ...validate, active: false })

    created_user.password = undefined!
    const code = await this.generateCode(created_user.id)
    await emailsQueue.addJobs({ user_data: created_user.$attributes as IUser, code: code.code })

    return created_user.$attributes
  }

  async login(auth: { identificator: string; password: string }) {
    const { identificator, password } = auth
    return User.verifyCredentials(identificator, password)
  }

  async findById(id: string) {
    const user = await User.find(id)

    if (!user) {
      throw { message: 'User not found', status: 404 }
    }
    //TODO: limimtar dados a retornar
    return user
  }

  async generateCode(user_id: string) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const created_code = await Code.create({ code, user_id })
    return created_code.$attributes
  }

  async confirmEmail(code: string) {
    const code_data = await Code.findBy('code', code)
    if (!code_data) throw { message: 'Code not found', status: 404 }
    await this.validateCode(code_data.code)
    const user = await User.find(code_data.user_id)
    if (!user) throw { message: 'User not found', status: 404 }
    user.active = true
    await user.save()
    await code_data.delete()
    return true
  }

  async resendConfirmationCode(id: string) {
    const code_data = await Code.findBy('user_id', id)
    if (!code_data) throw { message: 'Invalid code', status: 404 }
    const user = await User.find(code_data.user_id)
    if (!user) throw { message: 'User not found', status: 404 }
    if (user.active) throw { message: 'User already confirmed', status: 400 }
    const code = await this.generateCode(user.id)
    await Promise.all([
      emailsQueue.addJobs({ user_data: user.$attributes as IUser, code: code.code }),
      code_data.delete(),
    ])
    return true
  }

  async validateCode(code: string) {
    const code_data = await Code.findBy('code', code)
    if (!code_data) throw { message: 'Invalid code', status: 404 }
    if (code_data.expires_at < DateTime.now()) {
      await code_data.delete()
      throw { message: 'Code expired', status: 400 }
    }
    return code_data
  }
}
