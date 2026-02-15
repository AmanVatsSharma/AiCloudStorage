import { applySlidingWindowLimit, resetSlidingWindowState } from '@/lib/rate-limit/sliding-window';

describe('applySlidingWindowLimit', () => {
  beforeEach(() => {
    resetSlidingWindowState();
  });

  it('allows requests under the limit', () => {
    const result = applySlidingWindowLimit({
      key: 'user:1',
      maxRequests: 3,
      windowMs: 60_000,
      nowMs: 1_000,
    });

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests over the limit and returns retry-after', () => {
    const input = {
      key: 'user:1',
      maxRequests: 2,
      windowMs: 60_000,
    };

    applySlidingWindowLimit({ ...input, nowMs: 1_000 });
    applySlidingWindowLimit({ ...input, nowMs: 2_000 });
    const blocked = applySlidingWindowLimit({ ...input, nowMs: 3_000 });

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('allows again once window has passed', () => {
    const input = {
      key: 'user:1',
      maxRequests: 1,
      windowMs: 10_000,
    };

    applySlidingWindowLimit({ ...input, nowMs: 1_000 });
    const blocked = applySlidingWindowLimit({ ...input, nowMs: 2_000 });
    const allowedAgain = applySlidingWindowLimit({ ...input, nowMs: 12_500 });

    expect(blocked.allowed).toBe(false);
    expect(allowedAgain.allowed).toBe(true);
  });
});
