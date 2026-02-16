# PickleSG - Pickleball Court Booking Platform

A modern, mobile-first Progressive Web App for booking pickleball courts in Singapore with seamless PayNow integration.

![Status](https://img.shields.io/badge/status-pre--production-yellow)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Features

### Core Features ✅
- **Real-time Court Booking** - 7-day advance booking window with live availability
- **Calendar View** - Aggregated availability across all courts with countdown timers
- **PayNow Integration** - Seamless payments via HitPay with QR codes
- **User Authentication** - Email/password and Google OAuth via Supabase
- **Mobile-First PWA** - Installable app with offline support
- **Admin Dashboard** - Complete court and booking management
- **Email Notifications** - Automated confirmations via Resend
- **Singapore Timezone** - All operations in SGT (Asia/Singapore)

See [FEATURES.md](./FEATURES.md) for complete feature list.

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org) |
| Database | PostgreSQL ([Neon](https://neon.tech)) |
| ORM | [Prisma](https://www.prisma.io) |
| Auth | [Supabase Auth](https://supabase.com/auth) |
| Payment | [HitPay](https://www.hitpayapp.com) (PayNow) |
| Email | [Resend](https://resend.com) + [React Email](https://react.email) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Deployment | [Vercel](https://vercel.com) |

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (or Neon serverless)
- Supabase account
- HitPay account (sandbox for development)
- Resend account (for email)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pickleball-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in all required environment variables (see [Environment Variables](#environment-variables)).

4. **Set up database**
   ```bash
   # Run migrations
   npx prisma migrate dev

   # Seed initial data
   npx prisma db seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Database
```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### Supabase (Authentication)
```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### HitPay (Payments)
```env
HITPAY_API_KEY="your-api-key"
HITPAY_SALT="your-salt"
NEXT_PUBLIC_HITPAY_BASE_URL="https://api.sandbox.hit-pay.com/v1"  # Use production URL for prod
```

### Resend (Email)
```env
RESEND_API_KEY="re_your-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

### App Configuration
```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # Your app URL
```

See `.env.example` for a complete template.

---

## Development

### Project Structure

```
pickleball-app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── public/                    # Static assets
├── scripts/                   # Utility scripts
├── src/
│   ├── app/                   # Next.js app directory
│   │   ├── (auth)/           # Auth pages (login, signup)
│   │   ├── (main)/           # Main app pages
│   │   ├── admin/            # Admin dashboard
│   │   ├── api/              # API routes
│   │   ├── bookings/         # Booking pages
│   │   └── courts/           # Court pages
│   ├── components/           # React components
│   │   ├── booking/          # Booking-related components
│   │   ├── layout/           # Layout components
│   │   └── ui/               # shadcn/ui components
│   └── lib/                  # Utility libraries
│       ├── actions/          # Server actions
│       ├── booking/          # Booking logic
│       ├── email/            # Email templates
│       ├── hitpay/           # Payment integration
│       └── supabase/         # Auth helpers
├── FEATURES.md               # Feature documentation
├── PRD.md                    # Product requirements
└── README.md                 # This file
```

### Key Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma studio        # Open Prisma Studio (DB GUI)
npx prisma migrate dev   # Run migrations
npx prisma generate      # Generate Prisma Client
npx prisma db seed       # Seed database

# Type checking
npm run type-check       # Run TypeScript compiler
```

### Database Migrations

When you make schema changes:

```bash
# Create a new migration
npx prisma migrate dev --name your_migration_name

# Apply migrations in production
npx prisma migrate deploy
```

### Debugging

Run test scripts to verify functionality:

```bash
# Check booking window setting
npx tsx scripts/test/check-booking-window.ts

# Test countdown timer logic
npx tsx scripts/test/test-countdown-fixed.ts
```

---

## Testing

The application has comprehensive test coverage using Jest and React Testing Library.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

- **Unit Tests**: Business logic, utilities, and validation
- **Integration Tests**: Component interactions and API routes
- **Edge Cases**: Error handling, boundary conditions, and edge scenarios

Current test coverage:
- Slot availability checking
- Pricing calculations (peak/off-peak)
- Date/time handling and timezone conversions
- Booking validation
- Payment expiration logic
- Component rendering and user interactions
- Error handling scenarios

See [TESTING.md](./TESTING.md) for complete testing documentation.

---

## Deployment

### Deploying to Vercel

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Configure environment variables
   - Deploy

3. **Set up cron jobs**

   Create `vercel.json` in root:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/expire-bookings",
         "schedule": "*/5 * * * *"
       }
     ]
   }
   ```

4. **Configure custom domain** (optional)
   - Add domain in Vercel dashboard
   - Update DNS records
   - Update `NEXT_PUBLIC_APP_URL`

### Production Checklist

Before going to production:

- [ ] Switch HitPay to production API
- [ ] Set up production database backups
- [ ] Configure error monitoring (Sentry)
- [ ] Enable Vercel Analytics
- [ ] Test payment flow end-to-end
- [ ] Verify email deliverability
- [ ] Set up SSL/HTTPS
- [ ] Run security audit
- [ ] Load testing for booking system
- [ ] Create runbook for operations

See [PRD.md](./PRD.md) for detailed production deployment task list.

---

## Documentation

- **[FEATURES.md](./FEATURES.md)** - Complete list of implemented features
- **[TESTING.md](./TESTING.md)** - Testing guide and test coverage
- **[PRD.md](./PRD.md)** - Product requirements and future roadmap
- **Implementation Plan** - Detailed technical plan at `/Users/sean/.claude/plans/linear-coalescing-brooks.md`

### Key Concepts

#### Booking Window
- Users can book up to 7 days in advance
- Booking for day X opens at midnight SGT on day X-7
- Example: Booking for Jan 23 opens on Jan 16 at 00:00 SGT

#### Payment Flow
1. User selects court and time slots
2. Booking created with `PENDING` status
3. User redirected to payment page (PayNow QR)
4. 10-minute timeout starts
5. On payment success: webhook updates status to `CONFIRMED`
6. On timeout: booking cancelled, slots released

#### Timezone Handling
- All dates stored in UTC in database
- All calculations use Singapore timezone (Asia/Singapore, UTC+8)
- `date-fns-tz` library used for conversions

---

## API Documentation

### Webhooks

#### HitPay Payment Webhook
**Endpoint:** `POST /api/webhooks/hitpay`

Handles payment confirmations from HitPay.

**Security:** HMAC signature verification with salt

**Events:**
- `completed` - Payment successful, booking confirmed
- `failed` - Payment failed, booking cancelled

---

## Contributing

### Adding New Features

1. Check [PRD.md](./PRD.md) for planned features
2. Copy the relevant task list from PRD
3. Share with Claude for implementation
4. Test thoroughly
5. Update [FEATURES.md](./FEATURES.md) when complete

### Reporting Issues

- Describe the bug or issue clearly
- Include steps to reproduce
- Provide browser/device information
- Include error messages or screenshots

---

## Testing

### Manual Testing

Run through these critical flows:

1. **User Registration & Login**
   - Sign up with email
   - Sign up with Google OAuth
   - Log in with email
   - Log in with Google

2. **Booking Flow**
   - Browse courts
   - Select date and time
   - Select multiple consecutive slots
   - Complete payment
   - Receive confirmation email

3. **Admin Operations**
   - Create/edit court
   - Block court for maintenance
   - View all bookings
   - Cancel booking

4. **Mobile Experience**
   - Test on actual mobile device
   - Install as PWA
   - Test offline functionality

### Automated Tests (Planned)

See [PRD.md](./PRD.md#1-automated-testing-suite) for testing roadmap.

---

## Security

### Best Practices Implemented

- ✅ Server-side auth validation
- ✅ Protected API routes with middleware
- ✅ HMAC signature verification for webhooks
- ✅ SQL injection prevention via Prisma
- ✅ XSS prevention via React
- ✅ CSRF protection via SameSite cookies
- ✅ Environment variables for secrets
- ✅ Role-based access control (admin)

### Reporting Security Issues

Please email security issues to: [your-email]

---

## Performance

### Current Optimizations

- Server Components for reduced client-side JS
- Dynamic imports for code splitting
- Image optimization with Next.js Image
- Database connection pooling with Prisma

### Planned Optimizations

See [PRD.md - Performance Improvements](./PRD.md#performance-improvements)

---

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

---

## License

[Your License Here - e.g., MIT]

---

## Contact & Support

- **Email:** [your-email]
- **Website:** [your-website]
- **Issues:** [GitHub Issues URL]

---

## Acknowledgments

- [Next.js](https://nextjs.org) for the amazing framework
- [shadcn/ui](https://ui.shadcn.com) for beautiful components
- [Prisma](https://www.prisma.io) for excellent database tooling
- [Supabase](https://supabase.com) for auth infrastructure
- [HitPay](https://www.hitpayapp.com) for payment processing
- [Vercel](https://vercel.com) for hosting

---

**Made with ❤️ for the Pickleball community in Singapore**
