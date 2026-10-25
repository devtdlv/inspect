import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AppConfig } from '../config/configuration';
import { AUTH_SENSITIVE_THROTTLE } from './auth.constants';
import { AuthService } from './auth.service';
import type { AuthRequestUser } from './auth.types';
import { clearAuthCookies, readSessionToken, setSessionCookies } from './cookies';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CsrfGuard } from './guards/csrf.guard';
import { OriginGuard } from './guards/origin.guard';
import { SessionGuard } from './guards/session.guard';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Post('register')
  @UseGuards(OriginGuard)
  @Throttle(AUTH_SENSITIVE_THROTTLE)
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.register(body.email, body.password);
    setSessionCookies(
      res,
      this.config,
      result.rawToken,
      result.csrfToken,
      this.auth.getSessionTtlSeconds(),
    );
    return result.response;
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(OriginGuard)
  @Throttle(AUTH_SENSITIVE_THROTTLE)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(body.email, body.password);
    setSessionCookies(
      res,
      this.config,
      result.rawToken,
      result.csrfToken,
      this.auth.getSessionTtlSeconds(),
    );
    return result.response;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(OriginGuard, CsrfGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken = readSessionToken(req);
    const result = await this.auth.logout(rawToken);
    clearAuthCookies(res, this.config);
    return result;
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: AuthRequestUser) {
    return {
      user: this.auth.toPublicUser(user),
    };
  }
}
