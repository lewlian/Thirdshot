# P0 Implementation Plan: Thirdshot SaaS MVP

> **Goal:** Transform Thirdshot from a single-facility booking tool into a multi-tenant SaaS platform  
> **Timeline:** 4-6 weeks (aggressive but achievable with AI-assisted development)  
> **Approach:** Phase-by-phase, each phase deployable and testable independently

---

## Current Architecture

**Database Tables:** users, courts, bookings, booking_slots, payments, court_blocks, admin_audit_logs, app_settings, saved_payment_methods

**Stack:** Next.js 16 (App Router), Supabase (Auth + Postgres + RLS), HitPay payments, Vercel

**Key Limitation:** Everything is global — no concept of "which club owns this court/booking"

---

## P0 Features (10 items)

1. Multi-Tenant Architecture
2. Organization/Club Entity Model  
3. Membership Tiers & Management
4. Recurring Membership Billing
5. Enhanced User Role Management
6. Public Booking Pages
7. Financial Reporting Dashboard
8. Email Communication System
9. Waitlist Management
10. Guest/Drop-in Management

---

## Phase 1: Multi-Tenancy Foundation (Week 1)
*The core architectural change everything else depends on*

### 1.1 — New Database Tables

```sql
-- Organizations (clubs/venues)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- used for public URLs: thirdshot.app/o/{slug}
  description TEXT,
  logo_url TEXT,
  
  -- Contact info
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'SG',
  timezone TEXT DEFAULT 'Asia/Singapore',
  
  -- Branding
  primary_color TEXT DEFAULT '#10b981',
  
  -- Settings
  booking_window_days INT DEFAULT 7,
  slot_duration_minutes INT DEFAULT 60,
  max_consecutive_slots INT DEFAULT 3,
  payment_timeout_minutes INT DEFAULT 10,
  currency TEXT DEFAULT 'SGD',
  
  -- Payment config (per-org HitPay or Stripe keys)
  payment_provider TEXT DEFAULT 'hitpay',
  payment_api_key_encrypted TEXT,
  payment_salt_encrypted TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  plan TEXT DEFAULT 'free', -- free, starter, grow, pro
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organization members (join table: users <-> organizations)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role within this organization
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, staff, member, guest
  
  -- Member-specific settings
  membership_tier_id UUID REFERENCES membership_tiers(id),
  membership_start_date TIMESTAMPTZ,
  membership_end_date TIMESTAMPTZ,
  membership_status TEXT DEFAULT 'active', -- active, expired, cancelled, suspended
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, user_id)
);
```

### 1.2 — Add `organization_id` to ALL Existing Tables

```sql
-- Add org reference to existing tables
ALTER TABLE courts ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE bookings ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE court_blocks ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE admin_audit_logs ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE app_settings ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create indexes
CREATE INDEX idx_courts_org ON courts(organization_id);
CREATE INDEX idx_bookings_org ON bookings(organization_id);
CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
```

### 1.3 — Row Level Security (RLS) Policies

```sql
-- Organizations: members can read, owners can update
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active orgs" ON organizations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Org owners can update" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = (SELECT id FROM users WHERE supabase_id = auth.uid())
      AND role IN ('owner', 'admin')
    )
  );

-- Courts: scoped to organization
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read courts of org" ON courts
  FOR SELECT USING (true); -- public for booking pages

CREATE POLICY "Org admins manage courts" ON courts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = (SELECT id FROM users WHERE supabase_id = auth.uid())
      AND role IN ('owner', 'admin', 'staff')
    )
  );

-- Similar policies for bookings, booking_slots, etc.
```

### 1.4 — URL Structure & Routing

```
Current:  /courts, /bookings, /admin
New:      /o/{slug}/courts, /o/{slug}/bookings, /o/{slug}/admin
Public:   /o/{slug}/book (public booking page)
Platform: /dashboard (org selector if user belongs to multiple orgs)
```

**New App Router structure:**
```
src/app/
  (platform)/
    dashboard/page.tsx          -- org selector / overview
    create-org/page.tsx         -- create new organization
  o/[slug]/
    (public)/
      book/page.tsx             -- public booking page
      join/page.tsx             -- join as member
    (member)/
      courts/page.tsx           -- browse & book courts
      bookings/page.tsx         -- my bookings
      profile/page.tsx          -- member profile
    (admin)/
      admin/page.tsx            -- admin dashboard
      admin/courts/page.tsx     -- manage courts
      admin/members/page.tsx    -- manage members
      admin/bookings/page.tsx   -- manage bookings
      admin/settings/page.tsx   -- org settings
      admin/finance/page.tsx    -- financial reporting
  (auth)/                       -- existing auth pages (unchanged)
```

### 1.5 — Migration Strategy

- Create a "default" organization for existing data
- Backfill `organization_id` on all existing records
- Update all queries to filter by `organization_id`
- Update Supabase client helpers to include org context

---

## Phase 2: Enhanced Roles & Membership (Week 2)

### 2.1 — Membership Tiers Table

```sql
CREATE TABLE membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,           -- "Gold", "Silver", "Basic"
  description TEXT,
  
  -- Pricing
  price_cents INT NOT NULL DEFAULT 0,
  billing_period TEXT DEFAULT 'monthly', -- monthly, quarterly, yearly, one-time
  
  -- Benefits
  booking_discount_percent INT DEFAULT 0,
  max_advance_booking_days INT,          -- override org default
  max_bookings_per_week INT,             -- null = unlimited
  can_book_peak_hours BOOLEAN DEFAULT true,
  priority_booking BOOLEAN DEFAULT false, -- gets first access to new slots
  guest_passes_per_month INT DEFAULT 0,
  
  -- Display
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color TEXT,                   -- for UI badge
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 — Role Permission Matrix

| Action | Owner | Admin | Staff | Member | Guest |
|--------|-------|-------|-------|--------|-------|
| Manage org settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage staff/admins | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage courts | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage bookings | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ✅ | ❌ | ❌ |
| View finance | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create membership tiers | ✅ | ✅ | ❌ | ❌ | ❌ |
| Book courts | ✅ | ✅ | ✅ | ✅ | ✅* |
| View own bookings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cancel own booking | ✅ | ✅ | ✅ | ✅ | ✅ |

*Guest booking depends on org settings

### 2.3 — Permission Helper

```typescript
// src/lib/permissions.ts
export type OrgRole = 'owner' | 'admin' | 'staff' | 'member' | 'guest';

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 100,
  admin: 80,
  staff: 60,
  member: 40,
  guest: 20,
};

export function hasRole(userRole: OrgRole, requiredRole: OrgRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export async function getOrgMembership(userId: string, orgId: string) {
  // Returns membership with role, tier, status
}

export async function requireOrgRole(orgSlug: string, requiredRole: OrgRole) {
  // Middleware helper: throws if user doesn't have required role
}
```

---

## Phase 3: Recurring Billing & Payments (Week 3)

### 3.1 — Membership Billing Table

```sql
CREATE TABLE membership_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  member_id UUID NOT NULL REFERENCES organization_members(id),
  tier_id UUID NOT NULL REFERENCES membership_tiers(id),
  
  -- Billing
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'SGD',
  billing_period TEXT NOT NULL, -- monthly, quarterly, yearly
  
  -- Status
  status TEXT DEFAULT 'active', -- active, past_due, cancelled, paused
  
  -- Dates
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  next_billing_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Payment reference
  payment_method TEXT, -- paynow, card, etc.
  last_payment_id UUID REFERENCES payments(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 — Billing Cron Job

- Daily cron to check subscriptions due for renewal
- Generate invoices and trigger payment collection
- Send payment reminders for past_due subscriptions
- Auto-suspend after grace period (configurable per org)

### 3.3 — Invoice System

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  
  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,  -- ORG-2026-0001
  type TEXT NOT NULL, -- membership, booking, event, manual
  
  -- Line items stored as JSONB
  line_items JSONB NOT NULL DEFAULT '[]',
  
  -- Totals
  subtotal_cents INT NOT NULL,
  tax_cents INT DEFAULT 0,
  total_cents INT NOT NULL,
  currency TEXT DEFAULT 'SGD',
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, sent, paid, overdue, cancelled
  
  -- Dates
  issued_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Payment reference
  payment_id UUID REFERENCES payments(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Phase 4: Public Booking & Guest Management (Week 4)

### 4.1 — Public Booking Pages

Route: `/o/{slug}/book`

- No auth required to view availability
- Shows org branding (logo, colors, name)
- Browse available courts & time slots
- Guest checkout flow (email + name only)
- Member login option for discounted pricing
- Shareable link: `thirdshot-booking.vercel.app/o/picklesg/book`

### 4.2 — Guest/Drop-in System

```sql
-- Guests (non-registered users who book)
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  
  -- Tracking
  total_bookings INT DEFAULT 0,
  last_booking_at TIMESTAMPTZ,
  
  -- Conversion
  converted_to_user_id TEXT REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, email)
);
```

- Guests can book at non-member rates
- Auto-invite to become members after X bookings (configurable)
- Track guest-to-member conversion

### 4.3 — Waitlist System

```sql
CREATE TABLE waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  
  -- Who's waiting
  user_id TEXT REFERENCES users(id),
  guest_id UUID REFERENCES guests(id),
  
  -- What they want
  court_id UUID REFERENCES courts(id), -- null = any court
  desired_date DATE NOT NULL,
  desired_start_time TIME NOT NULL,
  desired_end_time TIME NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'waiting', -- waiting, offered, accepted, expired, cancelled
  offered_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,          -- offer expiry
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL)
);
```

- When a booking is cancelled, check waitlist
- Notify first person in queue via email
- 30-min window to accept before moving to next person

---

## Phase 5: Financial Reporting & Communications (Week 5)

### 5.1 — Financial Dashboard

Admin route: `/o/{slug}/admin/finance`

**Key Metrics:**
- Total revenue (daily/weekly/monthly/yearly)
- Revenue by source (bookings, memberships, events)
- Court utilization rate (% of slots booked)
- Member growth (new, churned, net)
- Outstanding invoices / accounts receivable
- Average revenue per member

**Implementation:** Server-side aggregation queries via Supabase RPC functions

```sql
-- Example: Revenue summary RPC
CREATE OR REPLACE FUNCTION get_revenue_summary(
  org_id UUID,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
) RETURNS JSON AS $$
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(total_cents), 0),
    'booking_count', COUNT(*),
    'avg_booking_value', COALESCE(AVG(total_cents), 0)
  )
  FROM bookings 
  WHERE organization_id = org_id
    AND status = 'CONFIRMED'
    AND created_at BETWEEN start_date AND end_date;
$$ LANGUAGE sql;
```

### 5.2 — Email Communication System

Using existing Resend integration, expand to:

- **Transactional emails:** Booking confirmations, reminders, cancellations (already partial)
- **Membership emails:** Welcome, renewal reminder, expiry notice, payment failed
- **Admin notifications:** New member, booking cancelled, payment received
- **Announcement system:** Org admins can send emails to all members / specific tiers

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id), -- null = system default
  
  type TEXT NOT NULL, -- booking_confirmation, membership_welcome, etc.
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  
  -- Template variables: {{member_name}}, {{org_name}}, {{booking_date}}, etc.
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, type)
);
```

---

## Phase 6: Integration & Polish (Week 6)

### 6.1 — Onboarding Flow

1. User signs up → lands on `/dashboard`
2. "Create Organization" wizard:
   - Organization name, slug, sport type
   - Upload logo, set brand color
   - Add first court(s)
   - Set pricing & booking rules
   - Configure membership tiers (optional)
   - Connect payment provider
3. Get shareable booking link
4. Invite staff/admins

### 6.2 — Platform Landing Page

Route: `/` (replace current single-facility homepage)

- SaaS marketing page explaining the product
- "Get Started Free" CTA
- Feature highlights
- Pricing tiers (for Thirdshot SaaS plans, not club memberships)

### 6.3 — Testing & Migration

- Create migration script for existing data → default organization
- End-to-end test: create org → add courts → create membership → public booking → payment
- Mobile responsive testing for all new pages
- RLS policy testing (ensure tenant isolation)

---

## Technical Decisions

### Database Migrations
All schema changes via Supabase SQL (executed through REST API with service role key). No Prisma migrations — we've already migrated to Supabase client.

### Auth Flow
Keep existing Supabase Auth. After login, resolve user's org memberships and route to appropriate org dashboard. Support multiple org memberships per user.

### Multi-Tenancy Model  
**Shared database, tenant column** (`organization_id` on every table). This is the right choice for our scale — simpler than schema-per-tenant, and Supabase RLS handles isolation.

### Org Context
Every API call and server action needs org context. We'll use the URL slug (`/o/{slug}/...`) to resolve the org, then pass `organization_id` through all queries.

### Payment Isolation
Each org can configure their own HitPay/Stripe keys. Revenue goes directly to the club. Thirdshot takes a platform fee (future: Stripe Connect).

---

## File Changes Summary

### New Files
```
src/app/(platform)/dashboard/page.tsx
src/app/(platform)/create-org/page.tsx
src/app/o/[slug]/(public)/book/page.tsx
src/app/o/[slug]/(public)/join/page.tsx
src/app/o/[slug]/(member)/layout.tsx
src/app/o/[slug]/(member)/courts/page.tsx
src/app/o/[slug]/(member)/bookings/page.tsx
src/app/o/[slug]/(admin)/admin/page.tsx
src/app/o/[slug]/(admin)/admin/courts/page.tsx
src/app/o/[slug]/(admin)/admin/members/page.tsx
src/app/o/[slug]/(admin)/admin/finance/page.tsx
src/app/o/[slug]/(admin)/admin/settings/page.tsx
src/lib/permissions.ts
src/lib/org-context.ts
src/lib/billing/subscriptions.ts
src/lib/billing/invoices.ts
src/types/organization.ts
scripts/db/001-create-organizations.sql
scripts/db/002-add-org-id-to-tables.sql
scripts/db/003-create-membership-tables.sql
scripts/db/004-create-billing-tables.sql
scripts/db/005-create-waitlist-tables.sql
scripts/db/006-create-email-templates.sql
scripts/db/007-rls-policies.sql
scripts/db/008-financial-rpc-functions.sql
scripts/db/migrate-existing-data.sql
```

### Modified Files
```
src/types/database.ts           -- regenerate with new tables
src/types/index.ts              -- add new type exports
src/lib/booking/availability.ts -- add org_id filtering
src/lib/booking/expire-stale-bookings.ts -- add org_id
src/lib/supabase/middleware.ts  -- resolve org from URL
src/app/layout.tsx              -- update for new routing
+ All existing pages need org context
```

---

## Execution Order

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | Multi-Tenancy Foundation | Org table, org_id on all tables, RLS, new routing, data migration |
| 2 | Roles & Membership | Membership tiers, role permissions, member management UI |
| 3 | Billing & Payments | Subscriptions, invoices, billing cron, payment flows |
| 4 | Public Booking & Guests | Public booking pages, guest checkout, waitlist |
| 5 | Finance & Comms | Revenue dashboard, email templates, announcements |
| 6 | Integration & Polish | Onboarding wizard, platform landing, testing, deploy |

---

## Ready to Build?

Phase 1 is the foundation. Once I start, here's what happens:
1. Run SQL migrations on Supabase to create new tables
2. Backfill existing data with a default organization
3. Restructure the app routing for multi-tenancy
4. Update all queries to be org-scoped
5. Push to GitHub → auto-deploy to Vercel

**I can start immediately. Say the word.** 🚀
