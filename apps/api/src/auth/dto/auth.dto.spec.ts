import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

describe('Auth email DTOs', () => {
  it('normalizes surrounding whitespace and uppercase before IsEmail on register', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: '  User@Example.COM  ',
      password: 'password123',
    });

    expect(dto.email).toBe('user@example.com');
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('normalizes email on login the same way', async () => {
    const dto = plainToInstance(LoginDto, {
      email: '  LOGIN@Example.COM ',
      password: 'password123',
    });

    expect(dto.email).toBe('login@example.com');
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('still rejects genuinely malformed emails after normalization', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: '  not-an-email  ',
      password: 'password123',
    });

    expect(dto.email).toBe('not-an-email');
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  it('rejects empty email that normalizes to empty string', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: '   ',
      password: 'password123',
    });

    expect(dto.email).toBe('');
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });
});
