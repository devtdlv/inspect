import { isEmailLengthValid, normalizeEmail } from './email.util';

describe('email.util', () => {
  it('normalizes email by trimming and lowercasing', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('validates email length', () => {
    expect(isEmailLengthValid('a@b.co')).toBe(true);
    expect(isEmailLengthValid('')).toBe(false);
    expect(isEmailLengthValid('x'.repeat(321))).toBe(false);
  });
});
