# Production Readiness Checklist

This document tracks all tasks that must be completed before launching PickleSG to production.

---

## 🔴 Critical (Must Complete Before Launch)

### **1. Rate Limiting - Upgrade to Redis**
**Status:** ⚠️ TODO
**Priority:** CRITICAL
**File:** [src/lib/rate-limit.ts](src/lib/rate-limit.ts)

**Current:** In-memory storage (development only)
**Required:** Upstash Redis for production

**Why Critical:**
- Rate limits will reset on every deployment
- Won't work with multiple server instances
- No persistence across restarts

**Steps:**
1. Sign up for Upstash Redis account
2. Create Redis database
3. Add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to environment variables
4. Install `@upstash/redis` package
5. Update rate-limit.ts to use Redis instead of Map
6. Update all function calls to async/await
7. Test all rate-limited endpoints
8. Monitor Upstash dashboard

**Documentation:** See [RATE-LIMITING-IMPLEMENTATION.md](RATE-LIMITING-IMPLEMENTATION.md) section "Production Upgrade Steps"

---

### **2. Email Service - Register Domain with Resend**
**Status:** ⚠️ TODO
**Priority:** CRITICAL
**File:** [src/lib/email/send.ts](src/lib/email/send.ts)

**Current:** Using placeholder domain
**Required:** Registered domain with proper DNS records

**Steps:**
1. Register domain (e.g., picklesg.com)
2. Add to Resend dashboard
3. Configure SPF, DKIM, and DMARC DNS records
4. Update `RESEND_FROM_EMAIL` in environment variables
5. Customize email templates with production branding
6. Test all email flows (signup, booking, reminder, cancellation)

**Documentation:** See [REMINDER-SYSTEM-SETUP.md](REMINDER-SYSTEM-SETUP.md) section "Production Setup"

---

### **3. Payment Gateway - Switch HitPay to Production**
**Status:** ⚠️ TODO
**Priority:** CRITICAL

**Current:** Using sandbox/test mode
**Required:** Production credentials and webhook endpoint

**Steps:**
1. Complete HitPay business verification
2. Get production API keys
3. Update `HITPAY_API_KEY` in production environment
4. Set production webhook URL
5. Verify webhook signature validation
6. Test end-to-end payment flow
7. Test refund process (if implemented)
8. Set up payment monitoring and alerts

---

### **4. Supabase - Production Configuration**
**Status:** ⚠️ TODO
**Priority:** CRITICAL

**Steps:**
1. Upgrade Supabase project to paid plan (if needed)
2. Verify RLS policies are properly set
3. Set up database backups
4. Configure custom domain for auth (optional)
5. Update redirect URLs in Supabase dashboard:
   - Email verification: `https://yourdomain.com/auth/callback`
   - Password reset: `https://yourdomain.com/reset-password`
6. Customize email templates in Supabase with branding
7. Set up database monitoring

---

### **5. Environment Variables - Production Setup**
**Status:** ⚠️ TODO
**Priority:** CRITICAL

**Required Variables:**
```env
# App
NEXT_PUBLIC_APP_URL=https://picklesg.com

# Database
DATABASE_URL=postgresql://production-url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Email (Resend)
RESEND_API_KEY=your-production-key
RESEND_FROM_EMAIL=noreply@picklesg.com

# Payment (HitPay)
HITPAY_API_KEY=your-production-key
HITPAY_WEBHOOK_SECRET=your-webhook-secret
HITPAY_SANDBOX_MODE=false

# Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 🟡 Important (Should Complete Before Launch)

### **6. Error Monitoring - Set Up Sentry**
**Status:** ⚠️ TODO
**Priority:** HIGH

**Steps:**
1. Create Sentry account
2. Create new Next.js project
3. Install `@sentry/nextjs`
4. Configure `sentry.client.config.ts` and `sentry.server.config.ts`
5. Add `SENTRY_DSN` to environment variables
6. Test error reporting
7. Set up alerts for critical errors

---

### **7. Analytics - Set Up Google Analytics**
**Status:** ⚠️ TODO
**Priority:** MEDIUM

**Steps:**
1. Create Google Analytics 4 property
2. Add tracking ID to environment variables
3. Install `react-ga4` or similar
4. Track key events:
   - Signups
   - Bookings created
   - Payments completed
   - Cancellations
5. Set up conversion tracking

---

### **8. Performance - Database Optimization**
**Status:** ⚠️ TODO
**Priority:** MEDIUM

**Steps:**
1. Review database indexes
2. Add indexes for frequently queried fields:
   - Booking.userId
   - Booking.status
   - BookingSlot.courtId
   - BookingSlot.startTime
3. Test query performance with production-like data
4. Set up database connection pooling
5. Configure appropriate timeout values

---

### **9. Security - SSL and HTTPS**
**Status:** ⚠️ TODO
**Priority:** HIGH

**Steps:**
1. Configure custom domain on Vercel
2. Enable automatic HTTPS
3. Set up HTTP → HTTPS redirect
4. Configure HSTS headers
5. Verify all external resources use HTTPS
6. Test with SSL Labs (A+ rating target)

---

### **10. Legal - Update Terms and Privacy Policy**
**Status:** ⚠️ TODO
**Priority:** MEDIUM

**Steps:**
1. Review [src/app/(main)/terms/page.tsx](src/app/(main)/terms/page.tsx)
2. Replace "Thirdshot Pte Ltd" with actual company name
3. Add actual business registration number
4. Update contact information
5. Have legal counsel review (recommended)
6. Do same for [src/app/(main)/privacy/page.tsx](src/app/(main)/privacy/page.tsx)

---

## 🟢 Nice to Have (Post-Launch)

### **11. Testing - End-to-End Tests**
**Status:** ⚠️ TODO
**Priority:** LOW

**Suggested Tools:**
- Playwright or Cypress
- Test key user flows:
  - Signup → Email verification → Login
  - Browse courts → Book slot → Pay → Confirmation
  - Password reset flow

---

### **12. Documentation - Admin Guide**
**Status:** ⚠️ TODO
**Priority:** LOW

**Create guides for:**
- How to add/modify courts
- How to handle customer support issues
- How to process refunds (if applicable)
- How to view booking analytics
- How to manage user accounts

---

### **13. Monitoring - Uptime Monitoring**
**Status:** ⚠️ TODO
**Priority:** MEDIUM

**Options:**
- UptimeRobot (free tier available)
- Better Uptime
- Pingdom

**Monitor:**
- Homepage (/)
- API health endpoint
- Booking creation flow
- Payment webhook endpoint

---

### **14. Backups - Automated Database Backups**
**Status:** ⚠️ TODO
**Priority:** MEDIUM

**Steps:**
1. Configure daily backups in database provider
2. Test backup restoration process
3. Set retention policy (30 days recommended)
4. Store backups in separate region/provider
5. Document recovery procedures

---

### **15. Caching - Implement CDN and Caching**
**Status:** ⚠️ TODO
**Priority:** LOW

**Considerations:**
- Vercel Edge Network (included)
- Cache static assets
- Consider caching court availability with short TTL
- Implement Redis caching for frequently accessed data

---

## 📋 Pre-Launch Testing Checklist

Before going live, manually test these flows:

### **Authentication**
- [ ] Signup with email verification
- [ ] Login with verified account
- [ ] Login with unverified account (should be blocked)
- [ ] Password reset flow
- [ ] Google OAuth signup
- [ ] Google OAuth login
- [ ] Rate limiting on login (5 failed attempts)
- [ ] Rate limiting on signup (3 attempts)

### **Booking**
- [ ] View court availability
- [ ] Book single slot
- [ ] Book multiple consecutive slots
- [ ] Book multiple non-consecutive slots
- [ ] Payment flow (test mode first)
- [ ] Booking confirmation email
- [ ] Rate limiting on booking (10 attempts)
- [ ] Expired booking cleanup (after 10 minutes)

### **Email Flows**
- [ ] Signup verification email
- [ ] Password reset email
- [ ] Booking confirmation email
- [ ] Booking reminder email (24h before)
- [ ] Booking cancellation email

### **Rate Limiting**
- [ ] Login rate limit (5 failed / 15min)
- [ ] Signup rate limit (3 / 1 hour)
- [ ] Booking rate limit (10 / 1 minute)
- [ ] Availability API rate limit (60 / 1 minute)

### **Error Handling**
- [ ] Network errors display user-friendly messages
- [ ] Invalid inputs are validated
- [ ] Expired sessions redirect to login
- [ ] Payment failures are handled gracefully
- [ ] Double-booking prevented by database constraints

### **Security**
- [ ] Email enumeration protection (forgot password)
- [ ] XSS prevention (all user inputs sanitized)
- [ ] SQL injection prevention (using Prisma)
- [ ] CSRF protection (Next.js built-in)
- [ ] Rate limiting on all critical endpoints

### **Performance**
- [ ] Homepage loads in < 2 seconds
- [ ] Booking creation completes in < 3 seconds
- [ ] Availability API responds in < 500ms
- [ ] Images are optimized
- [ ] No console errors in production

---

## 🎯 Go-Live Readiness

**Status:** NOT READY ⚠️

**Blocking Issues:**
1. ⚠️ Rate limiting not production-ready (in-memory storage)
2. ⚠️ Email service not configured (placeholder domain)
3. ⚠️ Payment gateway in test mode
4. ⚠️ Environment variables not set for production
5. ⚠️ Supabase redirect URLs not updated

**Minimum Requirements to Launch:**
- ✅ Complete all CRITICAL items (1-5)
- ✅ Complete pre-launch testing checklist
- ✅ Verify all environment variables are set
- ✅ Test on production domain before going live

---

## 📞 Support Contacts

**Add contact information for:**
- Supabase support
- Resend support
- HitPay support
- Upstash support
- Domain registrar
- Hosting provider (Vercel)

---

## 📅 Timeline

**Suggested timeline:**
1. Week 1: Complete CRITICAL items 1-5
2. Week 2: Complete IMPORTANT items 6-10
3. Week 3: Testing and bug fixes
4. Week 4: Soft launch and monitoring
5. Week 5: Full public launch

**Update this timeline based on your team's capacity and launch date.**

---

## ✅ Completion Tracking

**Progress: 0/15 items complete**

- [ ] 1. Rate Limiting - Upgrade to Redis
- [ ] 2. Email Service - Register Domain
- [ ] 3. Payment Gateway - Production Mode
- [ ] 4. Supabase - Production Configuration
- [ ] 5. Environment Variables - Production Setup
- [ ] 6. Error Monitoring - Set Up Sentry
- [ ] 7. Analytics - Set Up Google Analytics
- [ ] 8. Performance - Database Optimization
- [ ] 9. Security - SSL and HTTPS
- [ ] 10. Legal - Update Terms and Privacy Policy
- [ ] 11. Testing - End-to-End Tests
- [ ] 12. Documentation - Admin Guide
- [ ] 13. Monitoring - Uptime Monitoring
- [ ] 14. Backups - Automated Database Backups
- [ ] 15. Caching - Implement CDN and Caching

---

**Last Updated:** 2026-02-06
**Maintained By:** Development Team
