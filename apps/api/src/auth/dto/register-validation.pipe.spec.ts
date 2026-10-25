import { ValidationPipe } from '@nestjs/common';
import { RegisterDto } from './register.dto';

describe('RegisterDto via Nest ValidationPipe', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  async function run(body: Record<string, unknown>) {
    return pipe.transform(body, {
      type: 'body',
      metatype: RegisterDto,
      data: '',
    });
  }

  it('accepts uppercase email with surrounding whitespace', async () => {
    const result = (await run({
      email: '  User@Example.COM  ',
      password: 'password123',
    })) as RegisterDto;

    expect(result).toBeInstanceOf(RegisterDto);
    expect(result.email).toBe('user@example.com');
  });

  it('accepts .example TLD emails used by e2e', async () => {
    const result = (await run({
      email: '  ALICE@AUTH-E2E-TEST.EXAMPLE  ',
      password: 'password123',
    })) as RegisterDto;

    expect(result.email).toBe('alice@auth-e2e-test.example');
  });

  it('rejects invalid emails after normalization', async () => {
    await expect(run({ email: '  not-an-email  ', password: 'password123' })).rejects.toMatchObject(
      { status: 400 },
    );
  });
});
