# PickleSG - Implemented Features

> **Last Updated:** 2026-01-22
> **Status:** Pre-Production

---

## Table of Contents
- [Core Features](#core-features)
- [User Features](#user-features)
- [Admin Features](#admin-features)
- [Technical Features](#technical-features)
- [Completed Phases](#completed-phases)

---

## Core Features

### ✅ Authentication System
**Status:** COMPLETED
**Files:** `src/lib/supabase/*`, `src/app/(auth)/*`

- Email/password authentication via Supabase
- Google OAuth integration
- User sync between Supabase and Prisma database
- Protected routes with Next.js middleware
- Session management

**Key Files:**
- `src/lib/supabase/client.ts` - Client-side Supabase client
- `src/lib/supabase/server.ts` - Server-side Supabase client
- `src/app/(auth)/login/page.tsx` - Login page
- `src/app/(auth)/signup/page.tsx` - Signup page
- `src/middleware.ts` - Route protection

---

### ✅ Court Management System
**Status:** COMPLETED
**Files:** `src/app/courts/*`, `src/components/court-card.tsx`

- Display all active courts
- Court details with images and amenities
- Active/inactive court status
- Sort order for court display
- Court operating hours configuration

**Key Files:**
- `src/app/courts/page.tsx` - Courts listing page
- `src/app/courts/[courtId]/page.tsx` - Court detail & booking page
- `src/components/court-card.tsx` - Court card component
- `src/lib/actions/court.ts` - Court CRUD operations

---

### ✅ Booking System
**Status:** COMPLETED
**Files:** `src/lib/booking/*`, `src/components/booking/*`

**Features:**
- 7-day advance booking window
- Up to 3 consecutive hour slots per booking
- Real-time availability checking
- Atomic booking transactions (prevents double-booking)
- Peak hour pricing support
- Court blocking for maintenance/events
- Singapore timezone support throughout

**Key Components:**
1. **Availability Engine** (`src/lib/booking/availability.ts`)
   - Real-time slot availability
   - Considers existing bookings and court blocks
   - Operating hours validation
   - Booking window enforcement

2. **Aggregated Availability** (`src/lib/booking/aggregated-availability.ts`)
   - Aggregates availability across all courts
   - Calendar view data generation
   - Countdown timer calculations for future booking windows

3. **Pricing Engine** (`src/lib/booking/pricing.ts`)
   - Regular vs peak hour pricing
   - Multi-slot booking discounts (if applicable)
   - Price calculation per court

4. **Booking Actions** (`src/lib/actions/booking.ts`)
   - Create booking with Prisma transactions
   - Cancel booking
   - Payment status updates

**Key Files:**
- `src/lib/booking/availability.ts`
- `src/lib/booking/aggregated-availability.ts`
- `src/lib/booking/pricing.ts`
- `src/lib/actions/booking.ts`
- `src/components/booking/time-slot-grid.tsx`
- `src/components/booking/booking-summary.tsx`

---

### ✅ Calendar Availability View
**Status:** COMPLETED
**Date Added:** 2026-01-22
**Files:** `src/components/booking/calendar-availability.tsx`

**Features:**
- Calendar grid showing 7 bookable days + 1 extra day
- Aggregated availability across all courts
- Real-time countdown timer for upcoming booking windows
- Mobile-responsive design
- Shows available vs fully booked time slots
- Click-to-book functionality
- Peak hour indicators

**Technical Details:**
- Uses Singapore timezone (Asia/Singapore) throughout
- Countdown timer updates every second
- Responsive grid layout (mobile-first)
- Aggregates availability from all 4 courts
- Shows booking opening time for days not yet bookable

**Key Files:**
- `src/components/booking/calendar-availability.tsx` - Main calendar component
- `src/components/booking/countdown-timer.tsx` - Real-time countdown timer
- `src/lib/booking/aggregated-availability.ts` - Availability aggregation logic

**User Experience:**
- Users see 7 bookable days immediately
- Extra day (day 8) shows countdown to when booking opens
- Mobile-optimized with no text overlap
- Color-coded availability status (green = available, red = full)
- Tap any day to see time slots
- Tap time slot to proceed to court selection

---

### ✅ Payment Integration (HitPay)
**Status:** COMPLETED
**Files:** `src/lib/hitpay/*`, `src/app/api/webhooks/hitpay/*`

**Features:**
- PayNow QR code generation
- Payment status tracking
- 10-minute payment timeout
- Automatic slot release on payment timeout
- Webhook verification and handling
- Payment confirmation page

**Key Files:**
- `src/lib/hitpay/client.ts` - HitPay API integration
- `src/lib/hitpay/types.ts` - HitPay TypeScript types
- `src/app/api/webhooks/hitpay/route.ts` - Webhook handler
- `src/app/bookings/[bookingId]/pay/page.tsx` - Payment page
- `src/app/bookings/[bookingId]/confirmation/page.tsx` - Confirmation page

---

### ✅ User Dashboard & Booking Management
**Status:** COMPLETED
**Files:** `src/app/(main)/page.tsx`, `src/app/bookings/*`

**Features:**
- Home dashboard with upcoming bookings
- My bookings page with filtering
- Booking detail view
- Cancel booking functionality
- Booking history

**Key Files:**
- `src/app/(main)/page.tsx` - Home dashboard
- `src/app/bookings/page.tsx` - My bookings list
- `src/app/bookings/[bookingId]/page.tsx` - Booking detail
- `src/components/booking/booking-list.tsx`
- `src/components/booking/booking-card.tsx`

---

## Admin Features

### ✅ Admin Dashboard
**Status:** COMPLETED
**Files:** `src/app/admin/*`

**Features:**
- Protected admin routes (role-based access)
- Dashboard overview with stats
- Court management (CRUD)
- Court blocking system
- Booking management
- Audit log viewer

**Key Files:**
- `src/app/admin/layout.tsx` - Admin layout with protection
- `src/app/admin/page.tsx` - Dashboard overview
- `src/app/admin/courts/*` - Court management
- `src/app/admin/blocks/*` - Court blocking
- `src/app/admin/bookings/*` - Booking management
- `src/app/admin/audit-log/page.tsx` - Audit logs
- `src/lib/actions/admin.ts` - Admin authorization
- `src/lib/audit.ts` - Audit logging utility

---

## Technical Features

### ✅ Database & ORM
- PostgreSQL with Prisma ORM
- Atomic transactions for booking creation
- Audit logging for admin actions
- User, Booking, Court, CourtBlock, AuditLog tables
- App settings table for configuration

### ✅ Singapore Timezone Support
**Date Added:** 2026-01-22

All date/time operations use Singapore timezone (Asia/Singapore, UTC+8):
- Booking availability calculations
- Calendar date displays
- Countdown timers
- Operating hours
- Payment timeout calculations

**Files Using Timezone:**
- `src/lib/booking/availability.ts`
- `src/lib/booking/aggregated-availability.ts`
- `src/components/booking/countdown-timer.tsx`
- `src/lib/booking/pricing.ts`
- All booking-related server actions

### ✅ Email Notifications
**Status:** COMPLETED
**Provider:** Resend

- Booking confirmation emails
- Booking cancellation emails
- React Email templates
- HTML + plain text support

**Key Files:**
- `src/lib/email/client.ts`
- `src/lib/email/send.ts`
- `src/lib/email/templates/booking-confirmation.tsx`
- `src/lib/email/templates/booking-cancelled.tsx`

### ✅ Progressive Web App (PWA)
**Status:** COMPLETED

- next-pwa configuration
- Offline support with service worker
- Manifest.json for installability
- App icons and splash screens

**Key Files:**
- `next.config.ts` - PWA configuration
- `public/manifest.json`

### ✅ Mobile Responsive Design
**Date Added:** 2026-01-22

- Mobile-first Tailwind CSS approach
- Responsive breakpoints (sm:, md:, lg:)
- Touch-friendly interfaces
- No text overlap on small screens
- Optimized typography for mobile

---

## Completed Phases

### Phase 1: Database & Core Infrastructure ✅
- ✅ Database migrations
- ✅ TypeScript types from Prisma
- ✅ Zod validation schemas
- ✅ Auth middleware

### Phase 2: Authentication Pages ✅
- ✅ Login page
- ✅ Signup page
- ✅ OAuth callback handler
- ✅ Auth server actions
- ✅ User sync between Supabase and Prisma

### Phase 3: Core Booking Flow ✅
- ✅ Home/Dashboard page
- ✅ Courts listing page
- ✅ Court detail & booking page
- ✅ Time slot selection
- ✅ Booking server actions
- ✅ Availability checking logic
- ✅ Pricing calculation

### Phase 3.5: Calendar Availability Enhancement ✅
**Date Completed:** 2026-01-22
- ✅ Calendar grid view on home page
- ✅ Aggregated availability across all courts
- ✅ Countdown timer for upcoming booking windows
- ✅ Mobile-responsive design
- ✅ Singapore timezone integration

### Phase 4: Payment Integration ✅
- ✅ HitPay payment initiation
- ✅ PayNow QR code generation
- ✅ Payment webhook handler
- ✅ Payment confirmation page
- ✅ Payment timeout cron job

### Phase 5: User Account & Booking Management ✅
- ✅ My bookings page
- ✅ Booking detail page
- ✅ Cancel booking functionality
- ✅ Profile page
- ✅ User profile updates

### Phase 6: Email Notifications ✅
- ✅ Email client setup (Resend)
- ✅ Email templates (React Email)
- ✅ Booking confirmation emails
- ✅ Booking cancellation emails

### Phase 7: Admin Dashboard ✅
- ✅ Admin layout & protection
- ✅ Dashboard overview
- ✅ Court management
- ✅ Court blocking
- ✅ Booking management (admin view)
- ✅ Audit log viewer

### Phase 8: PWA & Polish ✅
- ✅ PWA configuration
- ✅ Theme & dark mode
- ✅ Navigation & layout
- ✅ Mobile responsiveness
- ✅ Footer

---

## Feature Statistics

| Category | Features Implemented |
|----------|---------------------|
| Core Features | 6 |
| User Features | 5 |
| Admin Features | 6 |
| Technical Features | 5 |
| Total Phases Completed | 8/8 |

---

## Recent Updates

### 2026-01-22: UI Simplification & Mobile Navigation
- **Monochrome Theme:** Converted entire UI to black/white/grayscale palette
- **Simplified Courts:** Reduced to 2 identical courts (SportCourt surface, same pricing)
- **Removed "Available Courts":** Streamlined home page, users start booking from calendar
- **Mobile Bottom Nav:** Replaced hamburger menu with sticky bottom navigation (Home, Book, Bookings, Profile)
- **Color System:** Updated all CSS variables and components to grayscale
- **Files Modified:** 10+ component files updated for monochrome theme

### 2026-01-22: Calendar Availability & Mobile Optimization (Earlier)
- Added calendar-based availability view on home page
- Implemented real-time countdown timer for upcoming booking windows
- Fixed mobile layout issues (text overlap)
- Ensured Singapore timezone usage throughout codebase
- Optimized responsive design for mobile devices

---

## Environment Configuration

### Required Environment Variables
```env
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# HitPay
HITPAY_API_KEY=
HITPAY_SALT=
NEXT_PUBLIC_HITPAY_BASE_URL=

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Testing Status

### Manual Testing Completed ✅
- ✅ User signup and login
- ✅ Google OAuth flow
- ✅ Court browsing and selection
- ✅ Date and time slot selection
- ✅ Multi-slot booking (up to 3 consecutive hours)
- ✅ Payment flow with HitPay
- ✅ Booking confirmation
- ✅ Email notifications
- ✅ Booking cancellation
- ✅ Admin dashboard access
- ✅ Court management (create, edit, delete)
- ✅ Court blocking
- ✅ Mobile responsiveness
- ✅ Calendar availability view
- ✅ Countdown timer functionality

### Automated Tests
- ⚠️ No automated tests yet (see PRD.md for future testing strategy)

---

## Known Issues & Limitations

### Current Limitations
1. No automated testing suite
2. Payment currently in sandbox mode (HitPay)
3. No analytics/tracking integration
4. No user notifications (push notifications)
5. No booking modification (must cancel and rebook)

### Performance Optimizations Needed
- Consider caching availability data
- Optimize image loading (courts)
- Implement pagination for booking history

---

## Technology Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Supabase Auth |
| Payment | HitPay (PayNow) |
| Email | Resend + React Email |
| UI | Tailwind CSS + shadcn/ui |
| State | React Server Components |
| Deployment | Vercel (planned) |
| Timezone | Asia/Singapore (UTC+8) |

---

## Documentation

- [README.md](./README.md) - Project setup and getting started
- [PRD.md](./PRD.md) - Product requirements and future features
- [FEATURES.md](./FEATURES.md) - This file (implemented features)
- Implementation Plan - `/Users/sean/.claude/plans/linear-coalescing-brooks.md`

---

**End of Features Document**