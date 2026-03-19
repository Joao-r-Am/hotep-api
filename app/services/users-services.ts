import User from '#models/UsersModel'
import { inject } from '@adonisjs/core'
import { AccessType, IUser } from '../interfaces/users.inteface.js'
import { registerValidator } from '#validators/auth'
import fs from 'fs';
import mail from '@adonisjs/mail/services/main'
import emailsQueue from '../queues/auth/emails.queue.js';

@inject()
export default class AuthService {
  constructor(private userModel: User) {}

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
    await emailsQueue.addJobs(created_user.$attributes)

    return created_user.$attributes
  }

  async login(auth: { identificator: string; password: string }) {
    const { identificator, password } = auth
    const user = await User.verifyCredentials(identificator, password)
    return user
  }
}
