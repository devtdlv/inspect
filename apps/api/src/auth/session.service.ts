import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session, User } from '@prisma/client';
import { AppConfig } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';

export type SessionWithUser = Session & { user: User };

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  createRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  createCsrfToken(): string {
    return randomBytes(32).toString('base64url');
  }

  getSessionTtlSeconds(): number {
    return this.config.get('auth.sessionTtlSeconds', { infer: true });
  }

  async createSession(userId: string): Promise<{ session: Session; rawToken: string }> {
    const rawToken = this.createRawToken();
    const tokenHash = this.hashToken(rawToken);
    const ttlSeconds = this.getSessionTtlSeconds();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const session = await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return { session, rawToken };
  }

  async findValidSessionByRawToken(rawToken: string): Promise<SessionWithUser | null> {
    if (!rawToken) {
      return null;
    }

    const tokenHash = this.hashToken(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.revokedAt) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async revokeSessionByRawToken(rawToken: string): Promise<boolean> {
    if (!rawToken) {
      return false;
    }

    const tokenHash = this.hashToken(rawToken);
    const result = await this.prisma.session.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return result.count > 0;
  }
}
