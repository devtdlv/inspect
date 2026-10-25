import { Module } from '@nestjs/common';
import { AuthSessionModule } from './auth-session.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './guards/csrf.guard';
import { OriginGuard } from './guards/origin.guard';

@Module({
  imports: [AuthSessionModule],
  controllers: [AuthController],
  providers: [AuthService, CsrfGuard, OriginGuard],
  exports: [AuthSessionModule, AuthService],
})
export class AuthModule {}
