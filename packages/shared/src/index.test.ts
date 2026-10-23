import { describe, expect, it } from 'vitest';
import { isHealthyStatus } from './index';

describe('isHealthyStatus', () => {
  it('returns true for ok', () => {
    expect(isHealthyStatus('ok')).toBe(true);
  });

  it('returns false for degraded and error', () => {
    expect(isHealthyStatus('degraded')).toBe(false);
    expect(isHealthyStatus('error')).toBe(false);
  });
});
