import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const passwords = {
    hash: jest.fn().mockResolvedValue('hashed'),
    verify: jest.fn(),
  } as unknown as PasswordService;

  const sessions = {
    createSession: jest.fn().mockResolvedValue({ rawToken: 'raw-session', session: { id: 's1' } }),
    createCsrfToken: jest.fn().mockReturnValue('csrf-token'),
    getSessionTtlSeconds: jest.fn().mockReturnValue(3600),
    revokeSessionByRawToken: jest.fn().mockResolvedValue(true),
  } as unknown as SessionService;

  const auth = new AuthService(prisma, passwords, sessions);

  beforeEach(() => {
    jest.clearAllMocks();
    (passwords.hash as jest.Mock).mockResolvedValue('hashed');
    (sessions.createSession as jest.Mock).mockResolvedValue({
      rawToken: 'raw-session',
      session: { id: 's1' },
    });
    (sessions.createCsrfToken as jest.Mock).mockReturnValue('csrf-token');
  });

  it('registers a user with normalized email and creates a session', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      createdAt,
      passwordHash: 'hashed',
    });

    const result = await auth.register('  User@Example.com ', 'password123');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { email: 'user@example.com', passwordHash: 'hashed' },
    });
    expect(result.response.user).toEqual({
      id: 'u1',
      email: 'user@example.com',
      createdAt: createdAt.toISOString(),
    });
    expect(result.rawToken).toBe('raw-session');
    expect(result.csrfToken).toBe('csrf-token');
    expect(JSON.stringify(result)).not.toContain('hashed');
  });

  it('rejects duplicate email registration safely', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
      code: 'P2002',
      clientVersion: 'test',
    });
    (prisma.user.create as jest.Mock).mockRejectedValue(error);

    await expect(auth.register('dup@example.com', 'password123')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('logs in with a valid password', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      passwordHash: 'hashed',
      createdAt,
    });
    (passwords.verify as jest.Mock).mockResolvedValue(true);

    const result = await auth.login('user@example.com', 'password123');
    expect(result.response.user.id).toBe('u1');
    expect(result.rawToken).toBe('raw-session');
  });

  it('rejects incorrect passwords with a generic message', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      passwordHash: 'hashed',
      createdAt: new Date(),
    });
    (passwords.verify as jest.Mock).mockResolvedValue(false);

    await expect(auth.login('user@example.com', 'bad')).rejects.toThrow(
      'Invalid email or password',
    );
    await expect(auth.login('user@example.com', 'bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects unknown emails with the same generic message', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(auth.login('missing@example.com', 'password123')).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('revokes the session on logout when a token is present', async () => {
    await expect(auth.logout('raw')).resolves.toEqual({ ok: true });
    expect(sessions.revokeSessionByRawToken).toHaveBeenCalledWith('raw');
  });
});
