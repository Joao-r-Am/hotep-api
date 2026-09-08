import { test } from '@japa/runner';
import AuthService from './users-services.js';
import { createQueryBuilderMock } from '../../tests/unit/helpers/mock_query_builder.js';
import { createRecordMock } from '../../tests/unit/helpers/mock_record.js';
import { createModelMock, ModelMock } from '../../tests/unit/helpers/model_mocks.js';
import { createSpy } from '../../tests/unit/helpers/spy.js';
import { expectError } from '../../tests/unit/helpers/expect_error.js';
import { makeUser, registerPayload } from '../../tests/unit/fixtures/users.js';
import { makeCode, expiredCode, codeAttributes } from '../../tests/unit/fixtures/codes.js';
import { AccessType } from '../interfaces/users.inteface.js';

test.group('AuthService', (group) => {
  let userModel: ModelMock;
  let codeModel: ModelMock;
  let emailsQueue: { addJobs: ReturnType<typeof createSpy> };
  let registerValidator: ReturnType<typeof createSpy>;
  let limiter: {
    isBlocked: ReturnType<typeof createSpy>;
    increment: ReturnType<typeof createSpy>;
    block: ReturnType<typeof createSpy>;
  };
  let service: AuthService;

  group.each.setup(() => {
    userModel = createModelMock();
    codeModel = createModelMock();
    emailsQueue = { addJobs: createSpy(async () => {}) };
    registerValidator = createSpy(async (payload: Record<string, unknown>) => payload);
    limiter = {
      isBlocked: createSpy(async () => false),
      increment: createSpy(async () => ({ consumed: 1 })),
      block: createSpy(async () => {}),
    };
    service = new AuthService({
      userModel,
      codeModel,
      emailsQueue,
      registerValidator: { validate: registerValidator },
      limiter,
    });
  });

  test('register cria usuário inativo com username do primeiro nome + sobrenome', async ({ assert }) => {
    const userBuilder = createQueryBuilderMock({ result: [] });
    userModel.query.mockImplementation(() => userBuilder);
    userModel.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: { ...payload, id: 'user-1' } }),
    );
    codeModel.create = createSpy(async () => createRecordMock({ attributes: codeAttributes() }));

    const result = await service.register(registerPayload({ lastname: 'Oliveira' }));

    assert.equal(result.username, 'ana.oliveira');
    assert.equal(result.active, true);
    assert.equal(result.access_type, AccessType.BASIC);
    assert.isTrue(userModel.create.calledTimes() === 1);
    const createdPayload = userModel.create.calls[0].args[0] as Record<string, unknown>;
    assert.isTrue(createdPayload.active === true);
    assert.isTrue(createdPayload.username === 'ana.oliveira');
    assert.isTrue(codeModel.create.calledTimes() === 1);
    assert.isTrue(emailsQueue.addJobs.calledTimes() === 1);
  });

  test('register gera username com sufixo numérico quando o username base já existe', async ({ assert }) => {
    const userBuilder = createQueryBuilderMock({ result: [{ id: 'user-existing' }] });
    userModel.query.mockImplementation(() => userBuilder);
    userModel.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: { ...payload, id: 'user-1' } }),
    );
    codeModel.create = createSpy(async () => createRecordMock({ attributes: codeAttributes() }));

    const result = await service.register(registerPayload());

    assert.match(result.username, /^ana\.oliveira\d/);
  });

  test('register valida o payload antes de criar o usuário', async ({ assert }) => {
    const userBuilder = createQueryBuilderMock({ result: [] });
    userModel.query.mockImplementation(() => userBuilder);
    userModel.create = createSpy(async (payload: Record<string, unknown>) =>
      createRecordMock({ attributes: { ...payload, id: 'user-1' } }),
    );
    codeModel.create = createSpy(async () => createRecordMock({ attributes: codeAttributes() }));

    await service.register(registerPayload());

    assert.isTrue(registerValidator.calledTimes() === 1);
    assert.deepEqual(registerValidator.calls[0].args[0], registerPayload());
  });

  test('login retorna as credenciais verificadas pelo model', async ({ assert }) => {
    const expected = makeUser({ active: true });
    userModel.verifyCredentials = createSpy(async () => expected);

    const result = await service.login({ identificator: 'ana@example.com', password: 'senha123' });

    assert.equal(result, expected);
    assert.isTrue(userModel.verifyCredentials.calledWith('ana@example.com', 'senha123'));
  });

  test('login lança 403 quando o usuário está inativo', async ({ assert }) => {
    const expected = makeUser();
    userModel.verifyCredentials = createSpy(async () => expected);

    await expectError(assert, () => service.login({ identificator: 'ana@example.com', password: 'senha123' }), {
      status: 403,
      message: 'E-mail não confirmado. Verifique sua caixa de entrada.',
    });
  });

  test('findById retorna o usuário encontrado', async ({ assert }) => {
    const user = createRecordMock({ attributes: { id: 'user-1' } });
    userModel.find = createSpy(async (id: string) => (id === 'user-1' ? user : null));

    const result = await service.findById('user-1');

    assert.equal(result, user);
    assert.isTrue(userModel.find.calledWith('user-1'));
  });

  test('findById lança 404 quando o usuário não existe', async ({ assert }) => {
    userModel.find = createSpy(async () => null);

    await expectError(assert, () => service.findById('user-invalid'), {
      status: 404,
      message: 'User not found',
    });
  });

  test('generateCode cria um código de 6 caracteres para o usuário', async ({ assert }) => {
    const attributes = codeAttributes();
    codeModel.create = createSpy(async () => createRecordMock({ attributes }));

    const result = await service.generateCode('user-1');

    assert.deepEqual(result, attributes);
    assert.isTrue(codeModel.create.calledTimes() === 1);
    const payload = codeModel.create.calls[0].args[0] as Record<string, unknown>;
    assert.equal(payload.user_id, 'user-1');
    assert.match(String(payload.code), /^[A-Z0-9]{6}$/);
  });

  test('confirmEmail ativa o usuário e deleta o código válido', async ({ assert }) => {
    const code = createRecordMock({ attributes: makeCode() });
    codeModel.findBy = createSpy(async () => code);
    const user = createRecordMock({ attributes: makeUser({ id: 'user-1' }) });
    userModel.find = createSpy(async () => user);

    const result = await service.confirmEmail('ABC123');

    assert.isTrue(result);
    assert.equal(user.active, true);
    assert.isTrue(user.save.calledTimes() === 1);
    assert.isTrue(code.delete.calledTimes() === 1);
  });

  test('confirmEmail lança 404 quando o código não existe', async ({ assert }) => {
    codeModel.findBy = createSpy(async () => null);

    await expectError(assert, () => service.confirmEmail('INVALID'), {
      status: 404,
      message: 'Code not found',
    });
  });

  test('confirmEmail lança 400 quando o código está expirado e o deleta', async ({ assert }) => {
    const expired = createRecordMock({ attributes: expiredCode() });
    codeModel.findBy = createSpy(async () => expired);

    await expectError(assert, () => service.confirmEmail('EXPIRED'), {
      status: 400,
      message: 'Code expired',
    });
    assert.isTrue(expired.delete.calledTimes() === 1);
  });

  test('confirmEmail lança 404 quando o usuário do código não existe', async ({ assert }) => {
    const code = createRecordMock({ attributes: makeCode() });
    codeModel.findBy = createSpy(async () => code);
    userModel.find = createSpy(async () => null);

    await expectError(assert, () => service.confirmEmail('ABC123'), {
      status: 404,
      message: 'User not found',
    });
  });

  test('resendConfirmationCode lança 404 quando não há código para o usuário', async ({ assert }) => {
    codeModel.findBy = createSpy(async () => null);

    await expectError(assert, () => service.resendConfirmationCode('user-1'), {
      status: 404,
      message: 'Invalid code',
    });
  });

  test('resendConfirmationCode lança 400 quando o usuário já está confirmado', async ({ assert }) => {
    const code = createRecordMock({ attributes: makeCode() });
    codeModel.findBy = createSpy(async () => code);
    const user = createRecordMock({ attributes: makeUser({ active: true, id: 'user-1' }) });
    userModel.find = createSpy(async () => user);

    await expectError(assert, () => service.resendConfirmationCode('user-1'), {
      status: 400,
      message: 'User already confirmed',
    });
    assert.isTrue(emailsQueue.addJobs.calledTimes() === 0);
  });

  test('resendConfirmationCode gera novo código, envia email e deleta o anterior', async ({ assert }) => {
    const code = createRecordMock({ attributes: makeCode() });
    codeModel.findBy = createSpy(async () => code);
    const user = createRecordMock({ attributes: makeUser({ active: false, id: 'user-1' }) });
    userModel.find = createSpy(async () => user);
    codeModel.create = createSpy(async () => createRecordMock({ attributes: codeAttributes({ code: 'NEW123' }) }));

    const result = await service.resendConfirmationCode('user-1');

    assert.isTrue(result);
    assert.isTrue(codeModel.create.calledTimes() === 1);
    assert.isTrue(emailsQueue.addJobs.calledTimes() === 1);
    assert.isTrue(code.delete.calledTimes() === 1);
  });

  test('validateCode retorna o código quando ainda é válido', async ({ assert }) => {
    const code = createRecordMock({ attributes: makeCode() });
    codeModel.findBy = createSpy(async () => code);

    const result = await service.validateCode('ABC123');

    assert.equal(result, code);
  });

  test('validateCode lança 404 quando o código é inválido', async ({ assert }) => {
    codeModel.findBy = createSpy(async () => null);

    await expectError(assert, () => service.validateCode('INVALID'), {
      status: 404,
      message: 'Invalid code',
    });
  });

  test('validateCode lança 400 quando o código expirou', async ({ assert }) => {
    const expired = createRecordMock({ attributes: expiredCode() });
    codeModel.findBy = createSpy(async () => expired);

    await expectError(assert, () => service.validateCode('EXPIRED'), {
      status: 400,
      message: 'Code expired',
    });
  });

  test('findByCnpjfOrUsername retorna sucesso quando encontra o usuário', async ({ assert }) => {
    const builder = createQueryBuilderMock({ result: [{ id: 'user-1' }] });
    userModel.query.mockImplementation(() => builder);

    const result = await service.findByCnpjfOrUsername('12345678901');

    assert.deepEqual(result, { msg: 'success.user_found', payload: '12345678901' });
    assert.isTrue(builder.where.calledWith('cnpjf', '12345678901'));
    assert.isTrue(builder.orWhere.calledWith('email', '12345678901'));
    assert.isTrue(limiter.isBlocked.calledTimes() === 1);
    assert.isTrue(limiter.increment.calledTimes() === 0);
  });

  test('findByCnpjfOrUsername lança 404 quando não encontra o usuário', async ({ assert }) => {
    const builder = createQueryBuilderMock({ result: [] });
    userModel.query.mockImplementation(() => builder);

    await expectError(assert, () => service.findByCnpjfOrUsername('inexistente'), {
      status: 404,
      message: 'User not found',
    });

    assert.isTrue(limiter.increment.calledTimes() === 1);
    assert.isTrue(limiter.block.calledTimes() === 0);
  });

  test('findByCnpjfOrUsername lança 429 e bloqueia por 1 minuto ao exceder o limite de falhas', async ({ assert }) => {
    const builder = createQueryBuilderMock({ result: [] });
    userModel.query.mockImplementation(() => builder);
    limiter.increment.mockResolvedValueOnce({ consumed: 7 });

    await expectError(assert, () => service.findByCnpjfOrUsername('inexistente'), {
      status: 429,
      message: 'Too many attempts. Try again in 1 minute.',
    });

    assert.isTrue(limiter.block.calledTimes() === 1);
    assert.isTrue(limiter.block.calledWith('find-user-by-cnpjf-username', '1 min'));
  });

  test('findByCnpjfOrUsername lança 429 sem consultar o banco quando está bloqueado', async ({ assert }) => {
    limiter.isBlocked.mockResolvedValueOnce(true);

    await expectError(assert, () => service.findByCnpjfOrUsername('qualquer'), {
      status: 429,
      message: 'Too many attempts. Try again in 1 minute.',
    });

    assert.isTrue(userModel.query.calledTimes() === 0);
    assert.isTrue(limiter.increment.calledTimes() === 0);
  });
});
