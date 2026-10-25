import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  beforeAll(async () => {
    await passwords.onModuleInit();
  });

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

  it('verifyForLogin runs dummy work for missing hashes and returns false', async () => {
    await expect(passwords.verifyForLogin(null, 'password123')).resolves.toBe(false);
    await expect(passwords.verifyForLogin(undefined, 'password123')).resolves.toBe(false);
  });

  it('verifyForLogin returns true only for matching real hashes', async () => {
    const digest = await passwords.hash('password123');
    await expect(passwords.verifyForLogin(digest, 'password123')).resolves.toBe(true);
    await expect(passwords.verifyForLogin(digest, 'wrong')).resolves.toBe(false);
  });
});
