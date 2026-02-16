# Rate Limiting Implementation Guide

## ✅ Implementation Complete!

Rate limiting has been fully implemented across all critical endpoints to prevent abuse and ensure fair usage of the platform.

---

## 🎯 Overview

Rate limiting is implemented using an in-memory store for development. **Before production launch, upgrade to Redis/Upstash** for persistence across server restarts and support for multiple instances.

---

## 🛡️ Protected Endpoints

### **1. Login (Failed Attempts)**
- **Limit:** 5 failed login attempts per 15 minutes per email
- **Purpose:** Prevent brute force attacks on user accounts
- **Key:** `login:failed:{email}`
- **Implementation:** [src/lib/actions/auth.ts:13-76](src/lib/actions/auth.ts#L13-L76)

**Behavior:**
```
User enters wrong password → Counter increments
After 5 failed attempts → "Too many login attempts. Try again in X minutes."
Successful login → Counter resets
```

---

### **2. Signup**
- **Limit:** 3 signup attempts per 1 hour per email
- **Purpose:** Prevent spam account creation
- **Key:** `signup:{email}`
- **Implementation:** [src/lib/actions/auth.ts:78-120](src/lib/actions/auth.ts#L78-L120)

**Behavior:**
```
User submits signup form → Counter increments
After 3 attempts → "Too many signup attempts. Try again in X minutes."
Counter resets after 1 hour
```

---

### **3. Booking Creation**
- **Limit:** 10 booking attempts per 1 minute per user
- **Purpose:** Prevent spam bookings and system abuse
- **Key:** `booking:{userId}`
- **Implementation:**
  - [src/lib/actions/booking.ts:43-173](src/lib/actions/booking.ts#L43-L173) (`createBooking`)
  - [src/lib/actions/booking.ts:202-289](src/lib/actions/booking.ts#L202-L289) (`createMultipleBookings`)

**Behavior:**
```
User attempts booking → Counter increments
After 10 attempts → "Too many booking attempts. Try again in X seconds."
Counter resets after 1 minute
```

---

### **4. Availability API**
- **Limit:** 60 requests per 1 minute per IP address
- **Purpose:** Prevent scraping and excessive API calls
- **Key:** `availability:{ip}`
- **Implementation:** [src/app/api/courts/[courtId]/availability/route.ts:28-60](src/app/api/courts/[courtId]/availability/route.ts#L28-L60)

**Behavior:**
```
Client requests availability → Counter increments
After 60 requests → "Too many availability requests. Try again in X seconds."
Counter resets after 1 minute
```

---

## 📁 Architecture

### **Core Utility**
**File:** [src/lib/rate-limit.ts](src/lib/rate-limit.ts)

**Key Functions:**
```typescript
// Check and increment rate limit
checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult

// Check without incrementing (read-only)
getRateLimitStatus(key: string, config: RateLimitConfig): RateLimitResult | null

// Manually reset rate limit
resetRateLimit(key: string, keyPrefix: string): void

// Format user-friendly error messages
formatRateLimitError(result: RateLimitResult, action: string): string
```

**Pre-configured Limits:**
```typescript
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
};
```

---

## 🔄 How It Works

### **In-Memory Storage**
```typescript
const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp
}
```

### **Automatic Cleanup**
```typescript
// Runs every 5 minutes to remove expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
```

### **Rate Limit Flow**
```
1. Request comes in
2. Check if key exists in store
3. If expired → Delete and allow
4. If count >= max → Return error with resetIn time
5. If count < max → Increment and allow
6. Return result with remaining attempts and resetAt time
```

---

## 🎨 User Experience

### **Error Messages**
Rate limit errors are user-friendly and informative:

```typescript
// Login failed - 3 minutes remaining
"Too many login attempts. Please try again in 3 minutes."

// Signup rate limit - 45 minutes remaining
"Too many signup attempts. Please try again in 45 minutes."

// Booking rate limit - 30 seconds remaining
"Too many booking attempts. Please try again in 1 minute."

// Availability rate limit
"Too many availability requests. Please try again in 1 minute."
```

### **Response Format**
```typescript
interface RateLimitResult {
  allowed: boolean;        // Can proceed?
  remaining: number;       // Attempts left
  resetIn: number;         // Seconds until reset
  resetAt: Date;          // Absolute reset time
}
```

---

## 🧪 Testing

### **Manual Testing Scenarios**

#### **1. Login Rate Limit**
```
✅ Test Steps:
1. Try logging in with wrong password 5 times
2. 6th attempt → Rate limit error
3. Wait 15 minutes
4. Can log in again
5. Successful login → Counter resets

❌ Expected Error After 5 Attempts:
"Too many login attempts. Please try again in 15 minutes."
```

#### **2. Signup Rate Limit**
```
✅ Test Steps:
1. Try signing up with same email 3 times
2. 4th attempt → Rate limit error
3. Wait 1 hour
4. Can sign up again

❌ Expected Error After 3 Attempts:
"Too many signup attempts. Please try again in 60 minutes."
```

#### **3. Booking Rate Limit**
```
✅ Test Steps:
1. Rapidly create 10 booking attempts
2. 11th attempt → Rate limit error
3. Wait 1 minute
4. Can book again

❌ Expected Error After 10 Attempts:
"Too many booking attempts. Please try again in 1 minute."
```

#### **4. Availability API Rate Limit**
```
✅ Test Steps:
1. Make 60 API calls to /api/courts/{id}/availability
2. 61st call → 429 status with rate limit error
3. Wait 1 minute
4. Can make requests again

❌ Expected Response After 60 Requests:
Status: 429
Body: { "error": "Too many availability requests. Please try again in 1 minute." }
```

---

## 🚀 Production Upgrade Required

### **⚠️ CRITICAL: Upgrade to Redis Before Launch**

The current in-memory implementation has limitations:

**Current Limitations:**
- ❌ Rate limits reset on server restart
- ❌ Won't work with multiple server instances (each has its own memory)
- ❌ Not persistent across deployments
- ❌ Can't be monitored or managed centrally

**Solution: Upstash Redis**

Upstash provides serverless Redis with:
- ✅ Persistence across restarts
- ✅ Works with multiple instances
- ✅ Global edge network (low latency)
- ✅ Pay-per-request pricing
- ✅ Built-in dashboard and monitoring

---

## 📝 Production Upgrade Steps

### **1. Set Up Upstash Redis**

```bash
# 1. Sign up at https://upstash.com
# 2. Create a new Redis database
# 3. Copy the REST URL and token
```

### **2. Add Environment Variables**

```env
# .env.production
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### **3. Install Upstash SDK**

```bash
npm install @upstash/redis
```

### **4. Update Rate Limit Utility**

Replace the in-memory Map in [src/lib/rate-limit.ts](src/lib/rate-limit.ts) with Upstash Redis:

```typescript
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const fullKey = `${config.keyPrefix}${key.toLowerCase()}`;

  // Get current count and TTL
  const multi = redis.multi();
  multi.get(fullKey);
  multi.ttl(fullKey);
  const [count, ttl] = await multi.exec<[number | null, number]>();

  // First request or expired
  if (count === null || ttl === -2) {
    const windowSeconds = Math.ceil(config.windowMs / 1000);
    await redis.set(fullKey, 1, { ex: windowSeconds });

    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetIn: windowSeconds,
      resetAt: new Date(now + config.windowMs),
    };
  }

  // Check if limit exceeded
  if (count >= config.maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: ttl,
      resetAt: new Date(now + ttl * 1000),
    };
  }

  // Increment count
  await redis.incr(fullKey);

  return {
    allowed: true,
    remaining: config.maxAttempts - count - 1,
    resetIn: ttl,
    resetAt: new Date(now + ttl * 1000),
  };
}

export async function resetRateLimit(
  key: string,
  keyPrefix: string
): Promise<void> {
  const fullKey = `${keyPrefix}${key.toLowerCase()}`;
  await redis.del(fullKey);
}

export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const now = Date.now();
  const fullKey = `${config.keyPrefix}${key.toLowerCase()}`;

  const multi = redis.multi();
  multi.get(fullKey);
  multi.ttl(fullKey);
  const [count, ttl] = await multi.exec<[number | null, number]>();

  if (count === null || ttl === -2) {
    return null;
  }

  return {
    allowed: count < config.maxAttempts,
    remaining: Math.max(0, config.maxAttempts - count),
    resetIn: ttl,
    resetAt: new Date(now + ttl * 1000),
  };
}
```

### **5. Update Function Signatures**

After upgrading to Redis, rate limit functions become async:

```typescript
// Before (in-memory)
const result = checkRateLimit(key, config);

// After (Redis)
const result = await checkRateLimit(key, config);
```

Update all call sites to use `await`.

### **6. Test in Production**

```
✅ Test all rate-limited endpoints
✅ Verify limits persist across deployments
✅ Check Upstash dashboard for metrics
✅ Monitor for errors or latency issues
```

---

## 📊 Monitoring

### **Key Metrics to Track**

**Rate Limit Hits:**
- Number of 429 responses per endpoint
- Users hitting rate limits frequently (potential abuse)
- Peak traffic times

**Performance:**
- Rate limit check latency
- Redis response times (after upgrade)
- Impact on overall request time

**Abuse Detection:**
- IPs/users consistently hitting limits
- Unusual patterns (rapid bursts)
- Geographic distribution of rate-limited requests

### **Upstash Dashboard (After Upgrade)**

Monitor in real-time:
- Total requests
- Hit rate
- Latency (p50, p99)
- Top keys (most rate-limited)
- Memory usage

---

## 🔍 Troubleshooting

### **Issue: Rate limits not working**

**Check:**
1. Verify imports are correct
2. Check `checkRateLimit()` is called before action
3. Inspect rate limit response in browser dev tools
4. Check server logs for errors

### **Issue: Rate limit resets unexpectedly**

**Likely Cause:** Server restart (in-memory storage)

**Solution:** Upgrade to Redis for persistence

### **Issue: Different users share rate limit**

**Check:**
1. Verify unique keys (email, userId, IP)
2. Check key prefix configuration
3. Inspect actual keys in store (add logging)

### **Issue: 429 errors for legitimate users**

**Adjust:**
1. Increase `maxAttempts` if too strict
2. Extend `windowMs` for longer windows
3. Consider per-user vs per-IP limits
4. Add whitelist for trusted IPs/users

---

## 🎯 Summary

**Rate limiting is fully implemented with:**
- ✅ Login rate limiting (5 failed attempts / 15min)
- ✅ Signup rate limiting (3 attempts / 1 hour)
- ✅ Booking rate limiting (10 attempts / 1 min)
- ✅ Availability API rate limiting (60 requests / 1 min)
- ✅ Centralized rate limit utility
- ✅ User-friendly error messages
- ✅ Automatic cleanup of expired entries
- ✅ Pre-configured limits for all endpoints
- ⚠️ **TODO: Upgrade to Redis before production**

**Next Steps:**
1. ✅ Test all rate-limited endpoints manually
2. ⚠️ Upgrade to Upstash Redis before production launch
3. ✅ Monitor rate limit hits in production
4. ✅ Adjust limits based on real usage patterns

---

## 📚 References

- Rate Limit Utility: [src/lib/rate-limit.ts](src/lib/rate-limit.ts)
- Login Rate Limiting: [src/lib/actions/auth.ts](src/lib/actions/auth.ts)
- Booking Rate Limiting: [src/lib/actions/booking.ts](src/lib/actions/booking.ts)
- Availability Rate Limiting: [src/app/api/courts/[courtId]/availability/route.ts](src/app/api/courts/[courtId]/availability/route.ts)
- Upstash Redis Docs: https://upstash.com/docs/redis/overall/getstarted
- Redis Rate Limiting: https://redis.io/glossary/rate-limiting/

---

## ✨ Security Best Practices Implemented

1. ✅ **Failed login tracking** - Prevents brute force
2. ✅ **Signup throttling** - Prevents spam accounts
3. ✅ **Booking limits** - Prevents abuse and spam
4. ✅ **API rate limiting** - Prevents scraping
5. ✅ **Per-resource limits** - Different limits for different actions
6. ✅ **User-friendly errors** - Clear guidance on retry times
7. ✅ **Automatic reset** - Counters reset after time window
8. ✅ **Successful login resets** - Rewards legitimate users
9. ⚠️ **Production-ready** - Needs Redis upgrade

**The system is development-ready!** 🎉
**Upgrade to Redis before production launch!** ⚠️
