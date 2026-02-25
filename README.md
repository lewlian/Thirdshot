# Thirdshot - Pickleball Court Booking Platform

A modern, multi-tenant SaaS platform for pickleball clubs to manage court bookings, memberships, and payments. Built with Next.js 16 and designed mobile-first.

![Status](https://img.shields.io/badge/status-pre--production-yellow)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

**Live:** [thirdshot-booking.vercel.app](https://thirdshot-booking.vercel.app)

---

## Features

### Multi-Tenant Organization System
- Clubs operate under their own URL slug (`/o/your-club/...`)
- Per-org settings: timezone, currency, operating hours, branding
- Public club landing page with hero image, about, courts, and membership tiers
- Organization discovery dashboard for users who belong to multiple clubs
- Super admin role for platform-level management (creating new orgs)

### Court Management
- Create, edit, deactivate, and delete courts
- Per-court pricing with peak/off-peak rates (weekends + weekday evenings)
- Configurable slot durations (15-120 min) and operating hours
- Court blocks for maintenance, tournaments, and private events with conflict detection

### Booking System
- Real-time availability with calendar view
- Multi-slot consecutive booking (configurable max 1-8 slots)
- Configurable advance booking window (1-90 days)
- Daily booking limits per user
- Booking lifecycle: pending payment, confirmed, cancelled, expired, completed, no-show
- Add-to-calendar (.ics) generation for Google Calendar, Outlook, Apple Calendar
- Rate limiting on booking attempts

### Recurring Bookings (Admin)
- Create weekly recurring bookings on a specific day
- Auto-generates individual bookings across a date range
- Conflict detection: skips dates with existing bookings
- Cancel entire series or individual occurrences

### Payment Integration (HitPay)
- HitPay gateway with PayNow QR code support
- Configurable payment timeout (5-60 min) with countdown timer
- Saved payment methods for one-click checkout
- Webhook-driven payment confirmation with HMAC signature verification
- Automatic booking expiration on timeout

### Member Management
- Role hierarchy: owner > admin > staff > member > guest
- Custom membership tiers with pricing (monthly, quarterly, yearly)
- Invite members by email with auto-join flow
- Suspend, activate, and remove members
- Member directory with search, filtering, and pagination
- Tier assignment and role management

### Liability Waivers
- Admin-configurable waiver content with versioning
- Members must sign the active waiver before gaining full access
- Signature tracking with timestamps

### Public Pages
- Club landing page with hero, description, courts, pricing, and membership tiers
- Public booking page for guest bookings (when enabled by org)
- Public join page for new member signup with tier selection

### Email Notifications (Resend)
- Booking confirmation and cancellation emails
- Payment receipts
- Booking reminders (24 hours before, via cron)
- Email verification and password reset flows

### Admin Dashboard
- Quick stats: total members, new members, revenue, bookings
- Weekly calendar view with color-coded bookings and blocks
- Booking management with status filtering and admin cancellation
- Finance overview with revenue summaries by period (7d, 30d, 90d, YTD)
- Audit log tracking all admin actions with before/after data
- Organization settings and branding configuration

### Authentication & Security
- Email/password signup with email verification
- Google OAuth single sign-on
- Password reset flow
- Row-Level Security (RLS) on all tenant tables (24 policies)
- Role-based access control enforced at DB and server action level
- Rate limiting on login, signup, and booking endpoints
- HMAC webhook signature verification
- Middleware-protected routes

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Server Components) |
| Language | [TypeScript](https://www.typescriptlang.org) |
| Database | [Supabase](https://supabase.com) (PostgreSQL with RLS) |
| Auth | [Supabase Auth](https://supabase.com/auth) (SSR v0.8) |
| Payments | [HitPay](https://www.hitpayapp.com) (PayNow, card, saved cards) |
| Email | [Resend](https://resend.com) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Forms | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Deployment | [Vercel](https://vercel.com) |
| Testing | [Jest](https://jestjs.io) + React Testing Library |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (database + auth)
- HitPay account (sandbox for development)
- Resend account (for email)

### Installation

```bash
# Clone the repository
git clone https://github.com/lewlian/Thirdshot.git
cd Thirdshot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in all required values (see Environment Variables below)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Create a `.env` file from `.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"

# HitPay Payments
HITPAY_API_KEY="your-api-key"
HITPAY_SALT="your-webhook-salt"
NEXT_PUBLIC_HITPAY_BASE_URL="https://api.sandbox.hit-pay.com/v1"

# Resend Email
RESEND_API_KEY="re_your-api-key"
FROM_EMAIL="bookings@yourdomain.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="your-secure-cron-secret"
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login, signup, verify-email, password reset
│   ├── (platform)/          # Dashboard, create-org (platform-level)
│   ├── (main)/              # Legacy routes (redirect to /dashboard)
│   ├── o/[slug]/            # Organization-scoped routes
│   │   ├── (public)/        #   Public: landing page, join, book
│   │   ├── (member)/        #   Member: courts, bookings, profile, waiver
│   │   └── (admin)/         #   Admin: dashboard, courts, bookings, members,
│   │                        #          calendar, finance, settings, audit-log
│   └── api/                 # API routes, webhooks, cron jobs
├── components/
│   ├── booking/             # Booking flow components
│   ├── layout/              # Navigation, headers, footers
│   ├── admin/               # Admin-specific components
│   └── ui/                  # shadcn/ui primitives
└── lib/
    ├── actions/             # Server actions (booking, court, member, org, etc.)
    ├── email/               # Email templates and sending
    ├── hitpay/              # Payment gateway integration
    └── supabase/            # Auth helpers, client creation
```

---

## Key Commands

```bash
npm run dev            # Start dev server
npm run build          # Production build
npm run lint           # Run ESLint
npm test               # Run tests
npm run test:watch     # Tests in watch mode
npm run test:coverage  # Tests with coverage report
```

---

## Key Concepts

### Multi-Tenancy
Each organization operates under `/o/[slug]/`. Organization context is resolved via `getOrgBySlug()` with React `cache()` on the server, and `OrgProvider` + `useOrg()` on the client. All database tables include `organization_id` with RLS policies enforcing tenant isolation.

### Booking Flow
1. User selects court, date, and time slots
2. Booking created with `PENDING_PAYMENT` status (atomic RPC)
3. User redirected to payment page with countdown timer
4. On payment success: HitPay webhook confirms booking
5. On timeout: booking auto-expires, slots released

### Role Hierarchy
Roles are numeric: owner (100) > admin (80) > staff (60) > member (40) > guest (20). Permission checks use `requireOrgRole()` server-side and RLS policies at the database level.

### Pricing
Courts have a base price per hour. Peak pricing applies automatically during weekends and weekday evenings (18:00-21:00). Prices are stored in the organization's configured currency.

---

## Deployment

Deployed on Vercel with automatic deployments from the `main` branch.

### Cron Jobs (via `vercel.json`)
- **Expire bookings** (`/api/cron/expire-bookings`) - expires unpaid bookings past timeout
- **Send reminders** (`/api/cron/send-reminders`) - sends reminder emails 24h before booking

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/webhooks/hitpay` | Payment confirmation webhook |
| `POST /api/webhooks/hitpay/recurring` | Recurring/saved card payment webhook |
| `GET /api/courts/[courtId]/availability` | Slot availability for a court |
| `GET /api/bookings/[bookingId]/ical` | Generate .ics calendar file |
| `POST /api/auth/callback` | OAuth callback handler |
| `POST /api/auth/forgot-password` | Initiate password reset |
| `POST /api/auth/reset-password` | Complete password reset |
| `POST /api/create-org` | Create new organization (super admin) |
| `GET /api/cron/expire-bookings` | Expire stale pending bookings |
| `GET /api/cron/send-reminders` | Send booking reminder emails |

---

## Testing

```bash
npm test               # Run all tests
npm run test:coverage  # With coverage report
```

Coverage includes:
- Slot availability and pricing calculations
- Date/time handling and timezone conversions
- Booking validation and payment expiration logic
- Component rendering and user interactions

See [TESTING.md](./TESTING.md) for full testing documentation.

---

## Security

- Row-Level Security (RLS) on all 11 tenant tables with 24 policies
- Server-side auth validation on all protected routes
- HMAC signature verification for payment webhooks
- Rate limiting on auth and booking endpoints
- Role-based access control (owner/admin/staff/member/guest)
- Environment variables for all secrets
- XSS prevention via React, injection prevention via parameterized queries

---

## Documentation

- [FEATURES.md](./FEATURES.md) - Detailed feature documentation
- [TESTING.md](./TESTING.md) - Testing guide and coverage

---

## License

MIT

---

**Built for the pickleball community**
