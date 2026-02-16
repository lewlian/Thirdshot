/**
 * Rate Limiting Utility
 *
 * Simple in-memory rate limiting for development and testing.
 *
 * TODO: Before production launch, upgrade to Upstash Redis for:
 * - Persistence across server restarts
 * - Support for multiple server instances
 * - Better scalability
 *
 * See: https://upstash.com/docs/redis/overall/getstarted
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limits
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number; // Time window in milliseconds
  keyPrefix: string; // e.g., "login:", "signup:"
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
  resetAt: Date;
}

/**
 * Check rate limit for a given key
 *
 * @param key - Unique identifier (e.g., email, IP, userId)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const fullKey = `${config.keyPrefix}${key.toLowerCase()}`;
  const entry = rateLimitStore.get(fullKey);

  // Clean up expired entry
  if (entry && entry.resetAt < now) {
    rateLimitStore.delete(fullKey);
  }

  const current = rateLimitStore.get(fullKey);

  // First request in this window
  if (!current) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(fullKey, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
      resetAt: new Date(resetAt),
    };
  }

  // Check if limit exceeded
  if (current.count >= config.maxAttempts) {
    const resetIn = Math.ceil((current.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      resetAt: new Date(current.resetAt),
    };
  }

  // Increment count
  current.count++;

  return {
    allowed: true,
    remaining: config.maxAttempts - current.count,
    resetIn: Math.ceil((current.resetAt - now) / 1000),
    resetAt: new Date(current.resetAt),
  };
}

/**
 * Manually reset rate limit for a key (useful for testing or admin actions)
 */
export function resetRateLimit(key: string, keyPrefix: string): void {
  const fullKey = `${keyPrefix}${key.toLowerCase()}`;
  rateLimitStore.delete(fullKey);
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): RateLimitResult | null {
  const now = Date.now();
  const fullKey = `${config.keyPrefix}${key.toLowerCase()}`;
  const entry = rateLimitStore.get(fullKey);

  if (!entry || entry.resetAt < now) {
    return null;
  }

  return {
    allowed: entry.count < config.maxAttempts,
    remaining: Math.max(0, config.maxAttempts - entry.count),
    resetIn: Math.ceil((entry.resetAt - now) / 1000),
    resetAt: new Date(entry.resetAt),
  };
}

// Pre-configured rate limit configs for common use cases

export const RATE_LIMITS = {
  LOGIN_FAILED: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: "login:failed:",
  },
  SIGNUP: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: "signup:",
  },
  BOOKING: {
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: "booking:",
  },
  AVAILABILITY: {
    maxAttempts: 60,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: "availability:",
  },
} as const;

/**
 * Format rate limit error message for users
 */
export function formatRateLimitError(result: RateLimitResult, action: string): string {
  const minutes = Math.ceil(result.resetIn / 60);
  const timeUnit = minutes === 1 ? "minute" : "minutes";

  return `Too many ${action} attempts. Please try again in ${minutes} ${timeUnit}.`;
}
