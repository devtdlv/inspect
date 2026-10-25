import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUserResponse, PublicAuthUser } from './auth.types';
import { normalizeEmail } from './email.util';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionService,
  ) {}

  toPublicUser(user: { id: string; email: string; createdAt: Date }): PublicAuthUser {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async register(
    emailRaw: string,
    password: string,
  ): Promise<{ response: AuthUserResponse; rawToken: string; csrfToken: string }> {
    const email = normalizeEmail(emailRaw);
    const passwordHash = await this.passwords.hash(password);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Deliberate account-existence signal for registration UX. See docs/AUTH.md.
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }

    const { rawToken } = await this.sessions.createSession(user.id);
    const csrfToken = this.sessions.createCsrfToken();

    return {
      response: { user: this.toPublicUser(user) },
      rawToken,
      csrfToken,
    };
  }

  async login(
    emailRaw: string,
    password: string,
  ): Promise<{ response: AuthUserResponse; rawToken: string; csrfToken: string }> {
    const email = normalizeEmail(emailRaw);
    const user = await this.prisma.user.findUnique({ where: { email } });

    const valid = await this.passwords.verifyForLogin(user?.passwordHash, password);

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { rawToken } = await this.sessions.createSession(user.id);
    const csrfToken = this.sessions.createCsrfToken();

    return {
      response: { user: this.toPublicUser(user) },
      rawToken,
      csrfToken,
    };
  }

  async logout(rawToken: string | undefined): Promise<{ ok: true }> {
    if (rawToken) {
      await this.sessions.revokeSessionByRawToken(rawToken);
    }
    return { ok: true };
  }

  getSessionTtlSeconds(): number {
    return this.sessions.getSessionTtlSeconds();
  }
}
