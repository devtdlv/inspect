import { ConfigService } from '@nestjs/config';
import { SessionService } from './session.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SessionService', () => {
  const prisma = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const config = {
    get: jest.fn().mockReturnValue(3600),
  } as unknown as ConfigService;

  const sessions = new SessionService(
    prisma,
    config as unknown as ConfigService<import('../config/configuration').AppConfig, true>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates cryptographically random tokens and stable hashes', () => {
    const a = sessions.createRawToken();
    const b = sessions.createRawToken();
    expect(a).not.toEqual(b);
    expect(sessions.hashToken(a)).toHaveLength(64);
    expect(sessions.hashToken(a)).toBe(sessions.hashToken(a));
  });

  it('stores only the hashed token when creating a session', async () => {
    (prisma.session.create as jest.Mock).mockResolvedValue({
      id: 'sess_1',
      userId: 'user_1',
      tokenHash: 'abc',
      expiresAt: new Date(),
      revokedAt: null,
      createdAt: new Date(),
    });

    const result = await sessions.createSession('user_1');
    expect(result.rawToken.length).toBeGreaterThan(20);
    expect(prisma.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        tokenHash: sessions.hashToken(result.rawToken),
      }),
    });
  });

  it('returns null for expired sessions', async () => {
    (prisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'sess_1',
      userId: 'user_1',
      tokenHash: sessions.hashToken('token'),
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
      createdAt: new Date(),
      user: { id: 'user_1', email: 'a@b.co', createdAt: new Date() },
    });

    await expect(sessions.findValidSessionByRawToken('token')).resolves.toBeNull();
  });

  it('returns null for revoked sessions', async () => {
    (prisma.session.findUnique as jest.Mock).mockResolvedValue({
      id: 'sess_1',
      userId: 'user_1',
      tokenHash: sessions.hashToken('token'),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      createdAt: new Date(),
      user: { id: 'user_1', email: 'a@b.co', createdAt: new Date() },
    });

    await expect(sessions.findValidSessionByRawToken('token')).resolves.toBeNull();
  });

  it('revokes a session by raw token', async () => {
    (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    await expect(sessions.revokeSessionByRawToken('token')).resolves.toBe(true);
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: sessions.hashToken('token'),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
