import type { RequestRateLimitOptions } from './authentication.js';

type RateLimitCategory = 'anonymous' | 'organization' | 'user';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

const defaults: RequestRateLimitOptions = {
  anonymous: 60,
  organization: 600,
  user: 240,
  windowMs: 60_000,
};

export class RequestRateLimiter {
  // ponytail: per-process limits; move buckets to Redis when API replicas are added.
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly limits: RequestRateLimitOptions;

  constructor(limits?: RequestRateLimitOptions) {
    this.limits = limits ?? defaults;
  }

  consume(category: RateLimitCategory, key: string): RateLimitDecision {
    const now = Date.now();
    const limit = this.limits[category];
    const bucketKey = `${category}:${key}`;
    let bucket = this.buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + this.limits.windowMs };
      this.buckets.set(bucketKey, bucket);
    }

    if (bucket.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetAt: bucket.resetAt,
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      limit,
      remaining: limit - bucket.count,
      resetAt: bucket.resetAt,
    };
  }
}
