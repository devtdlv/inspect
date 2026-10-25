import { AUTH_EMAIL_MAX_LENGTH } from './auth.constants';

/** Trim and lowercase email for storage and lookup. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isEmailLengthValid(email: string): boolean {
  return email.length > 0 && email.length <= AUTH_EMAIL_MAX_LENGTH;
}
