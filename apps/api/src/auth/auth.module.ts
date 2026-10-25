import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './guards/csrf.guard';
import { OriginGuard } from './guards/origin.guard';
import { SessionGuard } from './guards/session.guard';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PasswordService, SessionService, SessionGuard, CsrfGuard, OriginGuard],
  exports: [AuthService, SessionService, SessionGuard, PasswordService],
})
export class AuthModule {}
