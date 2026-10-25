import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthModule } from '../src/auth/auth.module';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  SESSION_COOKIE_NAME,
} from '../src/auth/auth.constants';
import { PasswordService } from '../src/auth/password.service';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { AppConfig, configuration, validateEnv } from '../src/config/configuration';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

const E2E_AUTH_RATE_LIMIT = '100';

function parseSetCookies(header: string | string[] | undefined): Record<string, string> {
  const list = !header ? [] : Array.isArray(header) ? header : [header];
  const out: Record<string, string> = {};
  for (const raw of list) {
    const [pair] = raw.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) {
      out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
    }
  }
  return out;
}

function asCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('; ');
}

describe('Auth HTTP (email/password sessions)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ?? 'mysql://inspect_app:test@127.0.0.1:3306/inspect';
    process.env.COOKIE_SECURE = process.env.COOKIE_SECURE ?? 'false';
    process.env.COOKIE_SAME_SITE = process.env.COOKIE_SAME_SITE ?? 'lax';
    process.env.API_CORS_ORIGIN = process.env.API_CORS_ORIGIN ?? 'http://localhost:5173';
    // Keep production default (10/min) elsewhere; raise only for this suite's volume.
    process.env.AUTH_SENSITIVE_RATE_LIMIT = E2E_AUTH_RATE_LIMIT;

    const databaseUrl = process.env.DATABASE_URL ?? '';
    if (!databaseUrl.startsWith('mysql://') || databaseUrl.includes('replace_with')) {
      throw new Error('Auth e2e requires a real DATABASE_URL (mysql://...)');
    }

    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$queryRaw`SELECT 1 FROM users LIMIT 1`;
    } catch (error) {
      await prisma.$disconnect();
      throw new Error(
        `Auth e2e requires reachable MySQL users table: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
          validate: validateEnv,
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 200 }]),
        PrismaModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1', { exclude: ['healthz', 'readyz'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    const config = app.get(ConfigService<AppConfig, true>);
    app.useGlobalFilters(new AllExceptionsFilter(config.get('nodeEnv', { infer: true })));
    await app.init();
  }, 120_000);

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({
        where: { email: { endsWith: `@auth-e2e-${suffix}.example` } },
      });
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  function email(local: string): string {
    return `${local}@auth-e2e-${suffix}.example`;
  }

  it('rejects malformed registration payloads', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'password123' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: '  also-not-valid  ', password: 'password123' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email('ok'), password: 'short' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: email('ok') })
      .expect(400);
  });

  it('registers, returns public user, and sets session + CSRF cookies', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `  ${email('alice').toUpperCase()}  `, password: 'password123' })
      .expect(201);

    expect(response.body.user.email).toBe(email('alice'));
    expect(response.body.user.id).toBeTruthy();
    expect(response.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/argon2|passwordHash|tokenHash/i);

    const cookies = parseSetCookies(response.headers['set-cookie']);
    expect(cookies[SESSION_COOKIE_NAME]).toBeTruthy();
    expect(cookies[CSRF_COOKIE_NAME]).toBeTruthy();

    const stored = await prisma.user.findUnique({ where: { email: email('alice') } });
    expect(stored?.passwordHash.startsWith('$argon2id$')).toBe(true);

    const session = await prisma.session.findFirst({ where: { userId: stored!.id } });
    expect(session?.tokenHash).toHaveLength(64);
    expect(session?.tokenHash).not.toBe(cookies[SESSION_COOKIE_NAME]);
  });

  it('logs in when email casing and surrounding whitespace differ from stored form', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email('norm'), password: 'password123' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: `  ${email('norm').toUpperCase()}  `,
        password: 'password123',
      })
      .expect(200);

    expect(login.body.user.email).toBe(email('norm'));
  });

  it('rejects duplicate email registration', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email('dup'), password: 'password123' })
      .expect(201);

    const duplicate = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email('dup'), password: 'password123' })
      .expect(409);

    expect(duplicate.body.message).toMatch(/already exists/i);
  });

  it('logs in with correct credentials and rejects incorrect passwords', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email('bob'), password: 'password123' })
      .expect(201);

    const bad = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: email('bob'), password: 'wrong-password' })
      .expect(401);
    expect(bad.body.message).toBe('Invalid email or password');

    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: email('bob'), password: 'password123' })
      .expect(200);

    expect(ok.body.user.email).toBe(email('bob'));
    expect(parseSetCookies(ok.headers['set-cookie'])[SESSION_COOKIE_NAME]).toBeTruthy();
  });

  it('serves /auth/me for valid sessions and 401 otherwise', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email('cara'), password: 'password123' })
      .expect(201);

    const cookies = parseSetCookies(registered.headers['set-cookie']);
    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(
        'Cookie',
        asCookieHeader({
          [SESSION_COOKIE_NAME]: cookies[SESSION_COOKIE_NAME],
        }),
      )
      .expect(200);

    expect(me.body.user.email).toBe(email('cara'));
  });

  it('enforces session expiration', async () => {
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email('expired'), password: 'password123' })
      .expect(201);

    const cookies = parseSetCookies(registered.headers['set-cookie']);
    const prismaService = app.get(PrismaService);
    const user = await prismaService.user.findUniqueOrThrow({
      where: { email: email('expired') },
    });
    await prismaService.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(
        'Cookie',
        asCookieHeader({
          [SESSION_COOKIE_NAME]: cookies[SESSION_COOKIE_NAME],
        }),
      )
      .expect(401);
  });

  it('requires CSRF for logout and revokes the session', async () => {
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: email('logout'), password: 'password123' })
      .expect(201);

    const cookies = parseSetCookies(registered.headers['set-cookie']);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set(
        'Cookie',
        asCookieHeader({
          [SESSION_COOKIE_NAME]: cookies[SESSION_COOKIE_NAME],
          [CSRF_COOKIE_NAME]: cookies[CSRF_COOKIE_NAME],
        }),
      )
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set(
        'Cookie',
        asCookieHeader({
          [SESSION_COOKIE_NAME]: cookies[SESSION_COOKIE_NAME],
          [CSRF_COOKIE_NAME]: cookies[CSRF_COOKIE_NAME],
        }),
      )
      .set(CSRF_HEADER_NAME, cookies[CSRF_COOKIE_NAME])
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set(
        'Cookie',
        asCookieHeader({
          [SESSION_COOKIE_NAME]: cookies[SESSION_COOKIE_NAME],
        }),
      )
      .expect(401);

    const user = await prisma.user.findUniqueOrThrow({ where: { email: email('logout') } });
    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
  });

  it('rejects disallowed Origin on login', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: email('origin'), password: 'password123' })
      .expect(403);
  });

  it('rate-limits repeated login attempts', async () => {
    const passwords = app.get(PasswordService);
    const passwordHash = await passwords.hash('password123');
    await prisma.user.create({
      data: {
        email: email('throttle'),
        passwordHash,
      },
    });

    // ThrottlerStorageService keeps hits in both `_storage` and `hitExpirations`.
    const storage = app.get(ThrottlerStorage) as ThrottlerStorage & {
      storage: Map<string, unknown>;
      hitExpirations: Map<string, unknown>;
    };
    const resetThrottleState = () => {
      storage.storage.clear();
      storage.hitExpirations.clear();
    };
    resetThrottleState();
    process.env.AUTH_SENSITIVE_RATE_LIMIT = '5';

    try {
      let sawThrottle = false;
      for (let i = 0; i < 12; i += 1) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: email('throttle'), password: 'wrong-password-xx' });
        if (response.status === 429) {
          sawThrottle = true;
          break;
        }
      }

      expect(sawThrottle).toBe(true);
    } finally {
      process.env.AUTH_SENSITIVE_RATE_LIMIT = E2E_AUTH_RATE_LIMIT;
      resetThrottleState();
    }
  }, 120_000);
});
