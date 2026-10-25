import { Module } from '@nestjs/common';
import { SessionGuard } from './guards/session.guard';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

/**
 * Session verification primitives without HTTP auth controllers or throttling.
 * Used by JobsModule and other features that only need SessionGuard.
 */
@Module({
  providers: [PasswordService, SessionService, SessionGuard],
  exports: [PasswordService, SessionService, SessionGuard],
})
export class AuthSessionModule {}
