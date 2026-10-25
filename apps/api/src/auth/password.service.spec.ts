import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('hashes with Argon2id and verifies the correct password', async () => {
    const digest = await passwords.hash('correct-horse-battery');
    expect(digest.startsWith('$argon2id$')).toBe(true);
    await expect(passwords.verify(digest, 'correct-horse-battery')).resolves.toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const digest = await passwords.hash('correct-horse-battery');
    await expect(passwords.verify(digest, 'wrong-password')).resolves.toBe(false);
  });

  it('returns false for malformed hashes', async () => {
    await expect(passwords.verify('not-a-hash', 'anything')).resolves.toBe(false);
  });
});
