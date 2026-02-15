type TimestampMs = number;

interface RateLimitBucket {
  timestamps: TimestampMs[];
}

const buckets = new Map<string, RateLimitBucket>();

export interface SlidingWindowLimitInput {
  key: string;
  maxRequests: number;
  windowMs: number;
  nowMs?: number;
}

export interface SlidingWindowLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * In-memory sliding-window limiter for lightweight API protection.
 * NOTE: process-local only; replace with distributed store for multi-instance environments.
 */
export function applySlidingWindowLimit(input: SlidingWindowLimitInput): SlidingWindowLimitResult {
  const now = input.nowMs ?? Date.now();
  const windowStart = now - Math.max(1, input.windowMs);
  const maxRequests = Math.max(1, input.maxRequests);

  const bucket = buckets.get(input.key) ?? { timestamps: [] };
  const activeTimestamps = bucket.timestamps.filter((timestamp) => timestamp > windowStart);

  if (activeTimestamps.length >= maxRequests) {
    const oldest = activeTimestamps[0];
    const retryAfterMs = Math.max(0, oldest + input.windowMs - now);

    buckets.set(input.key, { timestamps: activeTimestamps });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  activeTimestamps.push(now);
  buckets.set(input.key, { timestamps: activeTimestamps });

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - activeTimestamps.length),
    retryAfterSeconds: 0,
  };
}

/**
 * Test helper to clear limiter state between tests.
 */
export function resetSlidingWindowState() {
  buckets.clear();
}
