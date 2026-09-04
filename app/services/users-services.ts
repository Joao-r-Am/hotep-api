import User from '#models/UsersModel';
import { AccessType, IUser } from '../interfaces/users.inteface.js';
import { registerValidator } from '#validators/auth';
import emailsQueue from '../queues/auth/emails.queue.js';
import Code from '#models/CodesModel';
import { DateTime } from 'luxon';
import limiter from '@adonisjs/limiter/services/main';
import { LimiterConsumptionOptions } from '@adonisjs/limiter/types';

const USERS_LOOKUP_LIMITER_OPTIONS: LimiterConsumptionOptions = {
  requests: 7,
  duration: '3 secs',
  blockDuration: '1 min',
};
const USERS_LOOKUP_KEY = 'find-user-by-cnpjf-username';
const USERS_LOOKUP_MAX_FAILURES = 7;

export type AuthServiceDeps = {
  userModel?: any;
  codeModel?: any;
  registerValidator?: { validate(data: Record<string, unknown>): Promise<any> };
  emailsQueue?: { addJobs(payload: unknown): Promise<void> };
  limiter?: {
    isBlocked(key: string | number): Promise<boolean>;
    increment(key: string | number): Promise<{ consumed: number }>;
    block(key: string | number, duration: string | number): Promise<unknown>;
  };
};

export default class AuthService {
  private readonly userModel: any;
  private readonly codeModel: any;
  private readonly registerValidator: AuthServiceDeps['registerValidator'];
  private readonly emailsQueue: AuthServiceDeps['emailsQueue'];
  private readonly limiter: NonNullable<AuthServiceDeps['limiter']>;

  constructor(deps: AuthServiceDeps = {}) {
    this.userModel = deps.userModel ?? User;
    this.codeModel = deps.codeModel ?? Code;
    this.registerValidator = deps.registerValidator ?? registerValidator;
    this.emailsQueue = deps.emailsQueue ?? emailsQueue;
    this.limiter = deps.limiter ?? limiter.use(USERS_LOOKUP_LIMITER_OPTIONS);
  }

  async register(user: Pick<IUser, 'email' | 'name' | 'password' | 'cnpjf' | 'phone' | 'especialty_area' | 'access_type' | 'lastname'>) {
    const validate = await this.registerValidator!.validate(user);
    user.access_type = AccessType.BASIC;
    let username = '';
    const find_user = await this.userModel
      .query()
      .from('users')
      .select('id')
      .whereILike('username', `${user.name.toLocaleLowerCase()}.${user.lastname.toLocaleLowerCase()}`);
    if (find_user.length) {
      const code = Math.random() * 1000;
      username = `${user.name.toLocaleLowerCase()}.${user.lastname.toLocaleLowerCase()}${code}`;
    } else {
      username = `${user.name.toLocaleLowerCase()}.${user.lastname.toLocaleLowerCase()}`;
    }

    const created_user = await this.userModel.create({ ...validate, active: false, username });

    created_user.password = undefined!;
    const code = await this.generateCode(created_user.id);
    await this.emailsQueue!.addJobs({
      user_data: created_user.$attributes as IUser,
      code: code.code,
    });

    return created_user.$attributes;
  }

  async login(auth: { identificator: string; password: string }) {
    const { identificator, password } = auth;
    const check = this.userModel.verifyCredentials(identificator, password);
    return check;
  }

  async findById(id: string) {
    const user = await this.userModel.find(id);

    if (!user) {
      throw { message: 'User not found', status: 404 };
    }
    //TODO: limimtar dados a retornar
    return user;
  }

  async generateCode(user_id: string) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const created_code = await this.codeModel.create({ code, user_id });
    return created_code.$attributes;
  }

  async confirmEmail(code: string) {
    const code_data = await this.codeModel.findBy('code', code);
    if (!code_data) throw { message: 'Code not found', status: 404 };
    await this.validateCode(code_data.code);
    const user = await this.userModel.find(code_data.user_id);
    if (!user) throw { message: 'User not found', status: 404 };
    user.active = true;
    await user.save();
    await code_data.delete();
    return true;
  }

  async resendConfirmationCode(id: string) {
    const code_data = await this.codeModel.findBy('user_id', id);
    if (!code_data) throw { message: 'Invalid code', status: 404 };
    const user = await this.userModel.find(code_data.user_id);
    if (!user) throw { message: 'User not found', status: 404 };
    if (user.active) throw { message: 'User already confirmed', status: 400 };
    const code = await this.generateCode(user.id);
    await Promise.all([this.emailsQueue!.addJobs({ user_data: user.$attributes as IUser, code: code.code }), code_data.delete()]);
    return true;
  }

  async validateCode(code: string) {
    const code_data = await this.codeModel.findBy('code', code);
    if (!code_data) throw { message: 'Invalid code', status: 404 };
    if (code_data.expires_at < DateTime.now()) {
      await code_data.delete();
      throw { message: 'Code expired', status: 400 };
    }
    return code_data;
  }

  async findByCnpjfOrUsername(payload: string) {
    if (await this.limiter.isBlocked(USERS_LOOKUP_KEY)) {
      throw { message: 'Too many attempts. Try again in 1 minute.', status: 429 };
    }

    const user = await this.userModel.query().from('users').where('cnpjf', payload).orWhere('email', payload);

    if (user.length <= 0) {
      const response = await this.limiter.increment(USERS_LOOKUP_KEY);
      if (response.consumed >= USERS_LOOKUP_MAX_FAILURES) {
        await this.limiter.block(USERS_LOOKUP_KEY, '1 min');
        throw { message: 'Too many attempts. Try again in 1 minute.', status: 429 };
      }
      throw { message: 'User not found', status: 404 };
    }

    return { msg: 'success.user_found', payload };
  }
}
