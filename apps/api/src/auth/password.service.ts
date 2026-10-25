import { Injectable, OnModuleInit } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

/** Fixed plaintext used only to precompute a dummy Argon2id digest for login timing. */
const DUMMY_PASSWORD_MATERIAL = 'inspect-login-timing-dummy-v1';

export const ARGON2_OPTIONS = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash!: string;
  private dummyHashReady: Promise<void> | null = null;

  async onModuleInit(): Promise<void> {
    await this.ensureDummyHash();
  }

  async hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      return false;
    }
  }

  /**
   * Always performs an Argon2id verify. When `passwordHash` is missing, verifies
   * against a process-local dummy digest so nonexistent-user logins spend similar work.
   * Returns true only when a real hash was provided and matched.
   */
  async verifyForLogin(
    passwordHash: string | null | undefined,
    password: string,
  ): Promise<boolean> {
    await this.ensureDummyHash();
    const digest = passwordHash ?? this.dummyHash;
    const matched = await this.verify(digest, password);
    return passwordHash != null && matched;
  }

  private ensureDummyHash(): Promise<void> {
    if (this.dummyHash) {
      return Promise.resolve();
    }
    if (!this.dummyHashReady) {
      this.dummyHashReady = this.hash(DUMMY_PASSWORD_MATERIAL).then((digest) => {
        this.dummyHash = digest;
      });
    }
    return this.dummyHashReady;
  }
}
