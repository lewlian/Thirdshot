# P0 Implementation Plan: Thirdshot SaaS MVP

> **Goal:** Transform Thirdshot from a single-facility booking tool into a multi-tenant SaaS platform
> **Timeline:** 6-8 weeks (realistic with AI-assisted development)
> **Approach:** Phase-by-phase, each phase deployable and testable independently
> **Last Updated:** 2026-02-22

---

## Platform Access (Verified 2026-02-22)

| Platform | Status | Access Level |
|----------|--------|--------------|
| GitHub | `git push/pull` to `lewlian/Thirdshot.git` | Full read/write |
| Vercel | `vercel --prod` as `lewlian` | Full deploy/manage |
| Supabase REST API | Service role key (bypasses RLS) | Full CRUD on all tables |
| Supabase Auth Admin | Admin API | Create/list/delete auth users |
| Supabase SQL Execution | Management API (`POST /v1/projects/{ref}/database/query`) | Full arbitrary SQL execution |

**No blockers.** All SQL migrations can be run programmatically via the Supabase Management API using the personal access token.

---

## Current Architecture

**Stack:** Next.js 16.1.1 (App Router + Turbopack), Supabase (Auth + Postgres), HitPay payments, Resend email, Vercel hosting

**Database Tables (9 active):**
| Table | PK Type | Purpose |
|-------|---------|---------|
| `users` | `TEXT` | User profiles, linked to Supabase Auth via `supabase_id` |
| `courts` | `TEXT` | Court definitions with pricing, hours, settings |
| `bookings` | `TEXT` | Booking records (status, totals, expiry) |
| `booking_slots` | `TEXT` | Individual time slots per booking |
| `payments` | `TEXT` | Payment records (HitPay integration) |
| `court_blocks` | `TEXT` | Court unavailability periods |
| `saved_payment_methods` | `TEXT` | Saved HitPay billing cards |
| `admin_audit_logs` | `TEXT` | Admin action audit trail |
| `app_settings` | `TEXT` (key) | Key-value application settings |

**Existing RPC Functions (5):** `create_booking_with_slots`, `confirm_booking_payment`, `expire_pending_bookings`, `get_profile_stats`, `get_total_revenue`

**Key Limitation:** Everything is global — no concept of "which club owns this court/booking." All IDs are `TEXT` (not UUID).

**Cleanup Needed:** Leftover tables from other projects exist in the database: `dogs`, `locations`, `sessions`, `session_dogs`, `_prisma_migrations`. These should be dropped.

---

## P0 Features (10 items from Competitive Analysis)

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

## Phase 0: Database Cleanup (Pre-requisite, 1 hour)

Remove orphaned tables from previous projects. Run in Supabase SQL Editor:

```sql
DROP TABLE IF EXISTS session_dogs CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS dogs CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS _prisma_migrations CASCADE;
```

---

## Phase 1: Multi-Tenancy Foundation (Week 1-2)

*The core architectural change everything else depends on.*

### 1.1 — New Database Tables

**IMPORTANT:** All existing tables use `TEXT` primary keys (not UUID). New tables that reference existing tables must use `TEXT` for those foreign keys. New tables use `TEXT` PKs with `gen_random_uuid()::text` for consistency.

```sql
-- ============================================
-- 1.1a: Organizations (clubs/venues)
-- ============================================
CREATE TABLE organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- public URLs: /o/{slug}
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

  -- Booking settings
  booking_window_days INT DEFAULT 7,
  slot_duration_minutes INT DEFAULT 60,
  max_consecutive_slots INT DEFAULT 3,
  payment_timeout_minutes INT DEFAULT 10,
  currency TEXT DEFAULT 'SGD',
  allow_guest_bookings BOOLEAN DEFAULT true,
  guest_to_member_threshold INT DEFAULT 3, -- invite to join after X bookings

  -- Payment config (per-org HitPay keys)
  payment_provider TEXT DEFAULT 'hitpay',   -- hitpay | stripe
  payment_api_key_encrypted TEXT,           -- encrypted with Supabase Vault or env secret
  payment_salt_encrypted TEXT,

  -- Subscription plan for the org itself (Thirdshot SaaS tier)
  plan TEXT DEFAULT 'free',                 -- free, starter, grow, pro
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================
-- 1.1b: Membership tiers (MUST be created BEFORE organization_members)
-- ============================================
CREATE TABLE membership_tiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,             -- "Gold", "Silver", "Basic"
  description TEXT,

  -- Pricing
  price_cents INT NOT NULL DEFAULT 0,
  billing_period TEXT DEFAULT 'monthly',  -- monthly, quarterly, yearly, one-time

  -- Benefits
  booking_discount_percent INT DEFAULT 0,
  max_advance_booking_days INT,           -- override org default (null = use org default)
  max_bookings_per_week INT,              -- null = unlimited
  can_book_peak_hours BOOLEAN DEFAULT true,
  priority_booking BOOLEAN DEFAULT false,
  guest_passes_per_month INT DEFAULT 0,

  -- Display
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  color TEXT,                     -- for UI badge color

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, name)
);

CREATE INDEX idx_membership_tiers_org ON membership_tiers(organization_id);

-- ============================================
-- 1.1c: Organization members (join table: users <-> organizations)
-- Now safe to reference membership_tiers
-- ============================================
CREATE TABLE organization_members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role within this organization
  role TEXT NOT NULL DEFAULT 'member',  -- owner, admin, staff, member, guest

  -- Membership info
  membership_tier_id TEXT REFERENCES membership_tiers(id) ON DELETE SET NULL,
  membership_start_date TIMESTAMPTZ,
  membership_end_date TIMESTAMPTZ,
  membership_status TEXT DEFAULT 'active',  -- active, expired, cancelled, suspended

  joined_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(organization_id, role);
```

### 1.2 — Add `organization_id` to ALL Existing Tables

Every tenant-scoped table gets an `organization_id` column. This includes tables the original plan missed (`booking_slots`, `payments`, `saved_payment_methods`).

```sql
-- Add organization_id to all existing tables
ALTER TABLE courts ADD COLUMN organization_id TEXT REFERENCES organizations(id);
ALTER TABLE bookings ADD COLUMN organization_id TEXT REFERENCES organizations(id);
ALTER TABLE booking_slots ADD COLUMN organization_id TEXT REFERENCES organizations(id);
ALTER TABLE payments ADD COLUMN organization_id TEXT REFERENCES organizations(id);
ALTER TABLE court_blocks ADD COLUMN organization_id TEXT REFERENCES organizations(id);
ALTER TABLE saved_payment_methods ADD COLUMN organization_id TEXT REFERENCES organizations(id);
ALTER TABLE admin_audit_logs ADD COLUMN organization_id TEXT REFERENCES organizations(id);

-- app_settings: change PK from just 'key' to composite (organization_id, key)
-- First add the column, then migrate to composite PK
ALTER TABLE app_settings ADD COLUMN organization_id TEXT REFERENCES organizations(id);
-- Drop old PK and create composite PK (done AFTER data migration in Phase 1.5)

-- Create indexes for tenant isolation queries
CREATE INDEX idx_courts_org ON courts(organization_id);
CREATE INDEX idx_bookings_org ON bookings(organization_id);
CREATE INDEX idx_booking_slots_org ON booking_slots(organization_id);
CREATE INDEX idx_payments_org ON payments(organization_id);
CREATE INDEX idx_court_blocks_org ON court_blocks(organization_id);
CREATE INDEX idx_saved_payment_methods_org ON saved_payment_methods(organization_id);
CREATE INDEX idx_admin_audit_logs_org ON admin_audit_logs(organization_id);
CREATE INDEX idx_app_settings_org ON app_settings(organization_id);
```

### 1.3 — Updated Triggers for New Tables

```sql
-- Add moddatetime triggers for all new tables
CREATE OR REPLACE TRIGGER set_updated_at_organizations
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_membership_tiers
  BEFORE UPDATE ON membership_tiers
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_organization_members
  BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
```

### 1.4 — Row Level Security (RLS) Policies — Complete

All policies use a helper to resolve the current user's `users.id` from their Supabase Auth UID:

```sql
-- Helper function: get app user ID from Supabase Auth UID
CREATE OR REPLACE FUNCTION get_app_user_id()
RETURNS TEXT AS $$
  SELECT id FROM users WHERE supabase_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: check if user has role in org
CREATE OR REPLACE FUNCTION user_has_org_role(org_id TEXT, required_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = get_app_user_id()
      AND role = ANY(required_roles)
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- Organizations
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active orgs"
  ON organizations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Org owners/admins can update"
  ON organizations FOR UPDATE
  USING (user_has_org_role(id, ARRAY['owner', 'admin']));

CREATE POLICY "Authenticated users can create orgs"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Organization Members
-- ============================================
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own org members"
  ON organization_members FOR SELECT
  USING (user_has_org_role(organization_id, ARRAY['owner','admin','staff','member','guest']));

CREATE POLICY "Org admins can manage members"
  ON organization_members FOR INSERT
  WITH CHECK (user_has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Org admins can update members"
  ON organization_members FOR UPDATE
  USING (user_has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "Org admins can delete members"
  ON organization_members FOR DELETE
  USING (user_has_org_role(organization_id, ARRAY['owner', 'admin']));

-- ============================================
-- Membership Tiers
-- ============================================
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active tiers"
  ON membership_tiers FOR SELECT
  USING (is_active = true);

CREATE POLICY "Org admins can manage tiers"
  ON membership_tiers FOR ALL
  USING (user_has_org_role(organization_id, ARRAY['owner', 'admin']));

-- ============================================
-- Courts
-- ============================================
ALTER TABLE courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read courts"
  ON courts FOR SELECT
  USING (true);  -- public for booking pages

CREATE POLICY "Org staff can manage courts"
  ON courts FOR INSERT
  WITH CHECK (user_has_org_role(organization_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Org staff can update courts"
  ON courts FOR UPDATE
  USING (user_has_org_role(organization_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Org staff can delete courts"
  ON courts FOR DELETE
  USING (user_has_org_role(organization_id, ARRAY['owner', 'admin', 'staff']));

-- ============================================
-- Bookings
-- ============================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bookings"
  ON bookings FOR SELECT
  USING (user_id = get_app_user_id()
    OR user_has_org_role(organization_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY "Authenticated users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own bookings or staff can update"
  ON bookings FOR UPDATE
  USING (user_id = get_app_user_id()
    OR user_has_org_role(organization_id, ARRAY['owner', 'admin', 'staff']));

-- ============================================
-- Booking Slots
-- ============================================
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read booking slots"
  ON booking_slots FOR SELECT
  USING (true);  -- needed for availability checks

CREATE POLICY "System can manage booking slots"
  ON booking_slots FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Payments
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  USING (user_id = get_app_user_id()
    OR user_has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "System can create payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update payments"
  ON payments FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- Court Blocks
-- ============================================
ALTER TABLE court_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read court blocks"
  ON court_blocks FOR SELECT
  USING (true);  -- needed for availability checks

CREATE POLICY "Org staff can manage court blocks"
  ON court_blocks FOR ALL
  USING (user_has_org_role(organization_id, ARRAY['owner', 'admin', 'staff']));

-- ============================================
-- Admin Audit Logs
-- ============================================
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can read audit logs"
  ON admin_audit_logs FOR SELECT
  USING (user_has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "System can create audit logs"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- App Settings
-- ============================================
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read settings"
  ON app_settings FOR SELECT
  USING (user_has_org_role(organization_id, ARRAY['owner','admin','staff','member']));

CREATE POLICY "Org admins can manage settings"
  ON app_settings FOR ALL
  USING (user_has_org_role(organization_id, ARRAY['owner', 'admin']));

-- ============================================
-- Saved Payment Methods
-- ============================================
ALTER TABLE saved_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payment methods"
  ON saved_payment_methods FOR SELECT
  USING (user_id = get_app_user_id());

CREATE POLICY "Users can manage own payment methods"
  ON saved_payment_methods FOR ALL
  USING (user_id = get_app_user_id());
```

**Note:** The service role key bypasses all RLS — our server actions use the service role key for writes, so RLS primarily protects direct Supabase client access from the browser.

### 1.5 — Data Migration (Existing Records)

```sql
-- Step 1: Create a default organization for existing data
INSERT INTO organizations (id, name, slug, email, description)
VALUES (
  'default-org',
  'Thirdshot Club',
  'thirdshot',
  'seanlewtengsiong@gmail.com',
  'Default organization migrated from single-tenant setup'
);

-- Step 2: Backfill organization_id on all existing records
UPDATE courts SET organization_id = 'default-org' WHERE organization_id IS NULL;
UPDATE bookings SET organization_id = 'default-org' WHERE organization_id IS NULL;
UPDATE booking_slots SET organization_id = 'default-org' WHERE organization_id IS NULL;
UPDATE payments SET organization_id = 'default-org' WHERE organization_id IS NULL;
UPDATE court_blocks SET organization_id = 'default-org' WHERE organization_id IS NULL;
UPDATE saved_payment_methods SET organization_id = 'default-org' WHERE organization_id IS NULL;
UPDATE admin_audit_logs SET organization_id = 'default-org' WHERE organization_id IS NULL;
UPDATE app_settings SET organization_id = 'default-org' WHERE organization_id IS NULL;

-- Step 3: Make organization_id NOT NULL now that all rows have values
ALTER TABLE courts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE booking_slots ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE court_blocks ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE saved_payment_methods ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE admin_audit_logs ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE app_settings ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Fix app_settings PK (from single 'key' to composite)
ALTER TABLE app_settings DROP CONSTRAINT app_settings_pkey;
ALTER TABLE app_settings ADD CONSTRAINT app_settings_pkey PRIMARY KEY (organization_id, key);

-- Step 5: Create organization_members for existing users
INSERT INTO organization_members (id, organization_id, user_id, role)
SELECT
  gen_random_uuid()::text,
  'default-org',
  id,
  CASE WHEN role = 'ADMIN' THEN 'owner' ELSE 'member' END
FROM users;
```

### 1.6 — URL Structure & Routing

```
CURRENT ROUTES → NEW ROUTES
─────────────────────────────────────────────────────────
/                           → / (SaaS landing page)
/courts                     → /o/{slug}/courts
/courts/[courtId]           → /o/{slug}/courts/[courtId]
/bookings                   → /o/{slug}/bookings
/bookings/[bookingId]       → /o/{slug}/bookings/[bookingId]
/bookings/[bookingId]/pay   → /o/{slug}/bookings/[bookingId]/pay
/bookings/[bookingId]/confirmation → /o/{slug}/bookings/[bookingId]/confirmation
/profile                    → /o/{slug}/profile
/admin                      → /o/{slug}/admin
/admin/courts               → /o/{slug}/admin/courts
/admin/bookings             → /o/{slug}/admin/bookings
/admin/users                → /o/{slug}/admin/members
/admin/audit-log            → /o/{slug}/admin/audit-log
/login, /signup, etc.       → /login, /signup (unchanged)

NEW ROUTES (no old equivalent):
/dashboard                  → org selector (if user has multiple orgs)
/create-org                 → create new organization wizard
/o/{slug}/book              → public booking page (no auth required)
/o/{slug}/join              → join org as member
/o/{slug}/admin/finance     → financial reporting dashboard
/o/{slug}/admin/settings    → org settings
/o/{slug}/admin/members     → member management (replaces /admin/users)
```

**Redirect strategy for old routes:** The old routes (`/courts`, `/bookings`, etc.) will redirect to `/o/{slug}/courts` etc. If the user belongs to exactly one org, redirect automatically. If multiple orgs, redirect to `/dashboard`.

**New App Router structure:**

```
src/app/
  layout.tsx                         -- root layout (unchanged)
  (auth)/                            -- existing auth pages (unchanged)
    login/page.tsx
    signup/page.tsx
    verify-email/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  auth/callback/route.ts             -- existing OAuth callback (unchanged)
  (platform)/
    layout.tsx                       -- authenticated platform layout
    page.tsx                         -- SaaS landing / marketing page
    dashboard/page.tsx               -- org selector / overview
    create-org/page.tsx              -- create organization wizard
  o/[slug]/
    layout.tsx                       -- org context provider (resolves org from slug)
    (public)/
      layout.tsx                     -- minimal layout for public pages
      book/page.tsx                  -- public booking page
      join/page.tsx                  -- join as member
    (member)/
      layout.tsx                     -- authenticated member layout (nav, header)
      courts/page.tsx                -- browse & book courts
      courts/[courtId]/page.tsx      -- court detail + booking form
      bookings/page.tsx              -- my bookings
      bookings/[bookingId]/page.tsx  -- booking detail
      bookings/[bookingId]/pay/page.tsx
      bookings/[bookingId]/confirmation/page.tsx
      profile/page.tsx               -- member profile
    (admin)/
      layout.tsx                     -- admin sidebar layout
      admin/page.tsx                 -- admin dashboard
      admin/courts/page.tsx          -- manage courts
      admin/courts/new/page.tsx
      admin/courts/[courtId]/edit/page.tsx
      admin/courts/[courtId]/block/page.tsx
      admin/members/page.tsx         -- manage members
      admin/bookings/page.tsx        -- manage bookings
      admin/finance/page.tsx         -- financial reporting
      admin/settings/page.tsx        -- org settings
      admin/audit-log/page.tsx       -- audit trail
  api/
    courts/[courtId]/availability/route.ts  -- add org_id param
    webhooks/hitpay/route.ts                -- route to correct org by booking_id
    webhooks/hitpay/recurring/route.ts
    cron/expire-bookings/route.ts           -- iterate all orgs
    cron/send-reminders/route.ts            -- iterate all orgs
    cron/process-billing/route.ts           -- NEW: recurring billing
```

### 1.7 — Org Context Helper

```typescript
// src/lib/org-context.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export interface OrgContext {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  booking_window_days: number;
  slot_duration_minutes: number;
  max_consecutive_slots: number;
  payment_timeout_minutes: number;
  allow_guest_bookings: boolean;
  primary_color: string;
  logo_url: string | null;
  payment_provider: string;
  plan: string;
}

/**
 * Resolve organization from URL slug. Used in o/[slug]/layout.tsx.
 * Returns org data or calls notFound() if slug doesn't exist.
 */
export async function getOrgBySlug(slug: string): Promise<OrgContext> {
  const supabase = await createServerSupabaseClient();
  const { data: org, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!org || error) {
    notFound();
  }

  return org as OrgContext;
}

/**
 * Get all orgs a user belongs to. Used in /dashboard.
 */
export async function getUserOrgs(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("user_id", userId);
  return data || [];
}

/**
 * Get user's membership in a specific org.
 */
export async function getOrgMembership(userId: string, orgId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("organization_members")
    .select("*, membership_tiers(*)")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .single();
  return data;
}
```

### 1.8 — Middleware Changes

```typescript
// src/middleware.ts — updated for multi-tenant routing
import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const authRoutes = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protected platform routes (not org-scoped)
  if ((pathname === "/dashboard" || pathname.startsWith("/create-org")) && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Org-scoped member/admin routes: /o/{slug}/(member|admin)/...
  // Public routes like /o/{slug}/book don't require auth
  const orgMemberMatch = pathname.match(/^\/o\/[^/]+\/(bookings|profile|courts)/);
  const orgAdminMatch = pathname.match(/^\/o\/[^/]+\/admin/);

  if ((orgMemberMatch || orgAdminMatch) && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin role check is done in the admin layout (requires DB query)

  return response;
}
```

### 1.9 — Update All Existing Queries

Every Supabase query must be scoped by `organization_id`. Example diff for `availability.ts`:

```typescript
// BEFORE
const { data: court } = await supabase
  .from('courts')
  .select('*')
  .eq('id', courtId)
  .single();

// AFTER
const { data: court } = await supabase
  .from('courts')
  .select('*')
  .eq('id', courtId)
  .eq('organization_id', orgId)  // ADD THIS
  .single();
```

**Files requiring org_id scoping:**
- `src/lib/booking/availability.ts` — all court/slot queries
- `src/lib/booking/expire-stale-bookings.ts` — expire query
- `src/lib/booking/pricing.ts` — price lookups
- `src/lib/actions/booking.ts` — create/cancel/get bookings
- `src/lib/actions/admin.ts` — admin operations
- `src/lib/actions/user.ts` — user profile (within org)
- `src/lib/hitpay/client.ts` — use org's payment keys
- `src/app/api/courts/[courtId]/availability/route.ts`
- `src/app/api/cron/expire-bookings/route.ts`
- `src/app/api/cron/send-reminders/route.ts`
- `src/app/api/webhooks/hitpay/route.ts`

### 1.10 — Update RPC Functions for Multi-Tenancy

```sql
-- Update create_booking_with_slots to include organization_id
CREATE OR REPLACE FUNCTION create_booking_with_slots(
  p_organization_id TEXT,    -- NEW PARAM
  p_user_id TEXT,
  p_type TEXT,
  p_total_cents INT,
  p_currency TEXT,
  p_expires_at TIMESTAMPTZ,
  p_slots JSONB
) RETURNS TEXT AS $$
DECLARE
  v_booking_id TEXT;
  v_slot JSONB;
  v_existing_count INT;
BEGIN
  v_booking_id := gen_random_uuid()::text;

  -- Check availability for each slot
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    SELECT COUNT(*) INTO v_existing_count
    FROM booking_slots bs
    JOIN bookings b ON b.id = bs.booking_id
    WHERE bs.court_id = v_slot->>'court_id'
      AND bs.organization_id = p_organization_id    -- SCOPED
      AND bs.start_time < (v_slot->>'end_time')::timestamptz
      AND bs.end_time > (v_slot->>'start_time')::timestamptz
      AND b.status NOT IN ('CANCELLED', 'EXPIRED');

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'One or more slots are no longer available';
    END IF;

    SELECT COUNT(*) INTO v_existing_count
    FROM court_blocks
    WHERE court_id = v_slot->>'court_id'
      AND organization_id = p_organization_id       -- SCOPED
      AND start_time < (v_slot->>'end_time')::timestamptz
      AND end_time > (v_slot->>'start_time')::timestamptz;

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'Court is blocked during selected time';
    END IF;
  END LOOP;

  -- Create booking
  INSERT INTO bookings (id, organization_id, user_id, type, total_cents, currency, status, expires_at, created_at, updated_at)
  VALUES (v_booking_id, p_organization_id, p_user_id, p_type, p_total_cents, p_currency, 'PENDING_PAYMENT', p_expires_at, NOW(), NOW());

  -- Create booking slots
  INSERT INTO booking_slots (id, organization_id, booking_id, court_id, start_time, end_time, price_in_cents, created_at, updated_at)
  SELECT
    gen_random_uuid()::text,
    p_organization_id,
    v_booking_id,
    s->>'court_id',
    (s->>'start_time')::timestamptz,
    (s->>'end_time')::timestamptz,
    (s->>'price_in_cents')::int,
    NOW(), NOW()
  FROM jsonb_array_elements(p_slots) AS s;

  -- Create payment record
  INSERT INTO payments (id, organization_id, booking_id, user_id, amount_cents, currency, status, created_at, updated_at)
  VALUES (gen_random_uuid()::text, p_organization_id, v_booking_id, p_user_id, p_total_cents, p_currency, 'PENDING', NOW(), NOW());

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Update other RPC functions similarly (add org_id param and scope queries)
-- expire_pending_bookings: iterate per-org or accept org_id param
-- get_profile_stats: accept org_id param
-- get_total_revenue: accept org_id param
-- confirm_booking_payment: lookup org_id from booking
```

### 1.11 — TypeScript Types Update Strategy

Since we no longer use Prisma, types are manually maintained in `src/types/database.ts`. After each SQL migration:

1. Add new table types to `src/types/database.ts` (Row, Insert, Update, Relationships)
2. Add `organization_id` field to all existing table types
3. Add new types to `src/types/index.ts` for convenience exports
4. Create `src/types/organization.ts` for org-specific types

---

## Phase 2: Enhanced Roles & Permissions (Week 3)

### 2.1 — Permission Helper (Full Implementation)

```typescript
// src/lib/permissions.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type OrgRole = "owner" | "admin" | "staff" | "member" | "guest";

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 100,
  admin: 80,
  staff: 60,
  member: 40,
  guest: 20,
};

export function hasMinRole(userRole: OrgRole, requiredRole: OrgRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get user's role in an organization. Returns null if not a member.
 */
export async function getUserOrgRole(
  userId: string,
  orgId: string
): Promise<OrgRole | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", orgId)
    .single();
  return (data?.role as OrgRole) ?? null;
}

/**
 * Server component helper: require minimum role or redirect.
 * Use in page.tsx files for admin/staff pages.
 */
export async function requireOrgRole(
  orgId: string,
  requiredRole: OrgRole
): Promise<{ userId: string; role: OrgRole }> {
  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("supabase_id", user.id)
    .single();

  if (!dbUser) redirect("/login");

  const role = await getUserOrgRole(dbUser.id, orgId);
  if (!role || !hasMinRole(role, requiredRole)) {
    redirect("/dashboard");
  }

  return { userId: dbUser.id, role };
}
```

### 2.2 — Role Permission Matrix

| Action | Owner | Admin | Staff | Member | Guest |
|--------|-------|-------|-------|--------|-------|
| Manage org settings | Yes | No | No | No | No |
| Delete organization | Yes | No | No | No | No |
| Manage admins/staff | Yes | Yes | No | No | No |
| Manage membership tiers | Yes | Yes | No | No | No |
| View financial reports | Yes | Yes | No | No | No |
| Manage courts | Yes | Yes | Yes | No | No |
| Manage all bookings | Yes | Yes | Yes | No | No |
| Manage members | Yes | Yes | Yes | No | No |
| View audit log | Yes | Yes | No | No | No |
| Book courts | Yes | Yes | Yes | Yes | Yes* |
| View own bookings | Yes | Yes | Yes | Yes | Yes |
| Cancel own booking | Yes | Yes | Yes | Yes | Yes |
| Edit own profile | Yes | Yes | Yes | Yes | No |

*Guest booking controlled by org `allow_guest_bookings` setting

### 2.3 — Member Management UI

New page: `/o/{slug}/admin/members`

- View all org members with role, tier, join date, status
- Invite new members by email
- Change member roles
- Assign/change membership tiers
- Suspend/activate members
- Bulk actions (email all, export CSV)

---

## Phase 3: Recurring Billing & Payments (Week 4)

### 3.1 — New Tables

```sql
-- ============================================
-- Membership Subscriptions
-- ============================================
CREATE TABLE membership_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  member_id TEXT NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES membership_tiers(id),

  -- Billing
  amount_cents INT NOT NULL,
  currency TEXT DEFAULT 'SGD',
  billing_period TEXT NOT NULL,  -- monthly, quarterly, yearly

  -- Status
  status TEXT DEFAULT 'active',  -- active, past_due, cancelled, paused

  -- Dates
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  next_billing_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Payment
  payment_method TEXT,          -- paynow, card, etc.
  last_payment_id TEXT REFERENCES payments(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON membership_subscriptions(organization_id);
CREATE INDEX idx_subscriptions_member ON membership_subscriptions(member_id);
CREATE INDEX idx_subscriptions_next_billing ON membership_subscriptions(next_billing_date)
  WHERE status = 'active';

CREATE OR REPLACE TRIGGER set_updated_at_membership_subscriptions
  BEFORE UPDATE ON membership_subscriptions
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================
-- Invoices
-- ============================================
CREATE TABLE invoices (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT NOT NULL REFERENCES users(id),

  -- Invoice details
  invoice_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,              -- membership, booking, manual
  description TEXT,

  -- Line items as JSONB array
  -- Each: { description, quantity, unit_price_cents, total_cents }
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Totals
  subtotal_cents INT NOT NULL,
  tax_cents INT DEFAULT 0,
  total_cents INT NOT NULL,
  currency TEXT DEFAULT 'SGD',

  -- Status
  status TEXT DEFAULT 'draft',     -- draft, sent, paid, overdue, cancelled, void

  -- Dates
  issued_at TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- Payment reference
  payment_id TEXT REFERENCES payments(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(organization_id, status);

CREATE OR REPLACE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================
-- Invoice number sequence (per-org)
-- ============================================
CREATE TABLE invoice_sequences (
  organization_id TEXT PRIMARY KEY REFERENCES organizations(id),
  last_number INT DEFAULT 0
);

CREATE OR REPLACE FUNCTION next_invoice_number(org_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_num INT;
  v_prefix TEXT;
BEGIN
  -- Upsert and increment
  INSERT INTO invoice_sequences (organization_id, last_number)
  VALUES (org_id, 1)
  ON CONFLICT (organization_id)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_num;

  -- Get org slug for prefix
  SELECT UPPER(LEFT(slug, 6)) INTO v_prefix FROM organizations WHERE id = org_id;

  RETURN v_prefix || '-' || EXTRACT(YEAR FROM now())::text || '-' || LPAD(v_num::text, 5, '0');
END;
$$ LANGUAGE plpgsql;
```

### 3.2 — Billing Cron Job

New API route: `src/app/api/cron/process-billing/route.ts`

Runs daily via Vercel Cron (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-bookings",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/process-billing",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Billing logic:**
1. Query `membership_subscriptions WHERE status = 'active' AND next_billing_date <= now()`
2. For each due subscription:
   a. Generate invoice via `next_invoice_number(org_id)`
   b. Attempt charge via org's payment provider (HitPay recurring charge or saved card)
   c. On success: update `current_period_start/end`, set `next_billing_date`, create payment record
   d. On failure: set status to `past_due`, send payment failed email
3. For `past_due` subscriptions past grace period (configurable, default 7 days):
   a. Set subscription status to `cancelled`
   b. Update `organization_members.membership_status` to `suspended`
   c. Send membership suspended email

### 3.3 — Payment Webhook Routing Per-Org

The HitPay webhook at `/api/webhooks/hitpay` currently processes payments globally. Update to route by org:

```typescript
// In webhook handler:
// 1. Extract booking_id from webhook payload
// 2. Look up booking → get organization_id
// 3. Load org's payment salt for signature verification
// 4. Process payment within org context
```

---

## Phase 4: Public Booking & Guest Management (Week 5)

### 4.1 — Public Booking Page

Route: `/o/{slug}/book` — **No authentication required**

Features:
- Org branding (logo, name, primary color)
- Browse available courts with photos/descriptions
- Calendar date picker → time slot grid
- Shows member vs non-member pricing (if different)
- "Login for member pricing" link
- Guest checkout: collect email + name + phone
- Redirect to payment flow

### 4.2 — Guest System

```sql
CREATE TABLE guests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,

  -- Tracking
  total_bookings INT DEFAULT 0,
  last_booking_at TIMESTAMPTZ,

  -- Conversion tracking
  converted_to_user_id TEXT REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, email)
);

CREATE INDEX idx_guests_org ON guests(organization_id);

-- Allow bookings to optionally reference a guest instead of user
ALTER TABLE bookings ADD COLUMN guest_id TEXT REFERENCES guests(id);
```

Guest booking flow:
1. Guest enters email + name on public booking page
2. Create/update guest record
3. Create booking with `guest_id` (and `user_id` = NULL)
4. Send confirmation email with booking link
5. After `guest_to_member_threshold` bookings, send "Join as member" email

### 4.3 — Waitlist System

```sql
CREATE TABLE waitlist_entries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id),

  -- Who's waiting (one must be set)
  user_id TEXT REFERENCES users(id),
  guest_id TEXT REFERENCES guests(id),

  -- What they want
  court_id TEXT REFERENCES courts(id),  -- TEXT to match courts.id type
  desired_date DATE NOT NULL,
  desired_start_time TIME NOT NULL,
  desired_end_time TIME NOT NULL,

  -- Status
  status TEXT DEFAULT 'waiting',  -- waiting, offered, accepted, expired, cancelled
  offered_at TIMESTAMPTZ,
  offer_expires_at TIMESTAMPTZ,   -- 30 min window to accept

  created_at TIMESTAMPTZ DEFAULT now(),

  CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL)
);

CREATE INDEX idx_waitlist_org_date ON waitlist_entries(organization_id, desired_date, status);

CREATE OR REPLACE TRIGGER set_updated_at_waitlist_entries
  BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
```

**Waitlist trigger logic** (in booking cancellation server action):
1. When a booking is cancelled, query waitlist for matching org + court + date/time
2. Offer to first `waiting` entry: set `status = 'offered'`, `offer_expires_at = now() + 30min`
3. Send email: "A slot opened up! Book within 30 minutes"
4. Cron job processes expired offers → move to next person in queue

---

## Phase 5: Financial Reporting & Communications (Week 6)

### 5.1 — Financial Dashboard

Route: `/o/{slug}/admin/finance`

**RPC Functions:**

```sql
-- Revenue summary with date range
CREATE OR REPLACE FUNCTION get_org_revenue_summary(
  p_org_id TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_booking_revenue BIGINT;
  v_membership_revenue BIGINT;
  v_booking_count INT;
  v_result JSONB;
BEGIN
  -- Booking revenue
  SELECT COALESCE(SUM(p.amount_cents), 0), COUNT(DISTINCT p.booking_id)
  INTO v_booking_revenue, v_booking_count
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE p.organization_id = p_org_id
    AND p.status = 'COMPLETED'
    AND p.paid_at BETWEEN p_start_date AND p_end_date
    AND b.type = 'COURT_BOOKING';

  -- Membership revenue (from invoices)
  SELECT COALESCE(SUM(total_cents), 0)
  INTO v_membership_revenue
  FROM invoices
  WHERE organization_id = p_org_id
    AND type = 'membership'
    AND status = 'paid'
    AND paid_at BETWEEN p_start_date AND p_end_date;

  RETURN jsonb_build_object(
    'booking_revenue_cents', v_booking_revenue,
    'membership_revenue_cents', v_membership_revenue,
    'total_revenue_cents', v_booking_revenue + v_membership_revenue,
    'booking_count', v_booking_count,
    'period_start', p_start_date,
    'period_end', p_end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Court utilization rate
CREATE OR REPLACE FUNCTION get_court_utilization(
  p_org_id TEXT,
  p_start_date DATE,
  p_end_date DATE
) RETURNS JSONB AS $$
DECLARE
  v_total_slots INT;
  v_booked_slots INT;
BEGIN
  -- Count total available slots
  SELECT COUNT(*) INTO v_total_slots
  FROM courts c
  CROSS JOIN generate_series(p_start_date, p_end_date, '1 day'::interval) AS d
  WHERE c.organization_id = p_org_id AND c.is_active = true;
  -- Simplified: assumes 1 slot per hour, open_time to close_time

  -- Count booked slots
  SELECT COUNT(*) INTO v_booked_slots
  FROM booking_slots bs
  JOIN bookings b ON b.id = bs.booking_id
  WHERE bs.organization_id = p_org_id
    AND b.status IN ('CONFIRMED', 'COMPLETED')
    AND bs.start_time::date BETWEEN p_start_date AND p_end_date;

  RETURN jsonb_build_object(
    'total_slots', v_total_slots,
    'booked_slots', v_booked_slots,
    'utilization_percent', CASE WHEN v_total_slots > 0
      THEN ROUND((v_booked_slots::numeric / v_total_slots) * 100, 1)
      ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql;

-- Member growth stats
CREATE OR REPLACE FUNCTION get_member_growth(
  p_org_id TEXT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_new_members INT;
  v_total_members INT;
  v_active_members INT;
BEGIN
  SELECT COUNT(*) INTO v_new_members
  FROM organization_members
  WHERE organization_id = p_org_id
    AND joined_at BETWEEN p_start_date AND p_end_date;

  SELECT COUNT(*) INTO v_total_members
  FROM organization_members
  WHERE organization_id = p_org_id
    AND role != 'guest';

  SELECT COUNT(*) INTO v_active_members
  FROM organization_members
  WHERE organization_id = p_org_id
    AND membership_status = 'active'
    AND role != 'guest';

  RETURN jsonb_build_object(
    'new_members', v_new_members,
    'total_members', v_total_members,
    'active_members', v_active_members
  );
END;
$$ LANGUAGE plpgsql;
```

**Dashboard UI components:**
- Revenue chart (daily/weekly/monthly toggle) using Recharts
- Court utilization heatmap (by day/hour)
- Member growth line chart
- Outstanding invoices table
- Key metrics cards: total revenue, active members, utilization %, avg booking value

### 5.2 — Email Communication System

```sql
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT REFERENCES organizations(id),  -- NULL = system default
  type TEXT NOT NULL,          -- booking_confirmation, membership_welcome,
                               -- membership_renewal, membership_expired,
                               -- payment_failed, waitlist_offer, announcement
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, type)
);

-- Email send log (for analytics and debugging)
CREATE TABLE email_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT REFERENCES organizations(id),
  recipient_email TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'sent',     -- sent, failed, bounced
  resend_id TEXT,                 -- Resend API message ID
  error TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_log_org ON email_log(organization_id, sent_at DESC);

CREATE OR REPLACE TRIGGER set_updated_at_email_templates
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
```

**Template variables** (replaced at send time):
- `{{member_name}}`, `{{member_email}}`
- `{{org_name}}`, `{{org_logo_url}}`
- `{{booking_date}}`, `{{booking_time}}`, `{{court_name}}`
- `{{invoice_number}}`, `{{amount_due}}`
- `{{membership_tier}}`, `{{expiry_date}}`
- `{{action_url}}` (link to relevant page)

**Announcement system:**
- Admin UI: compose email, select recipients (all members / specific tier / custom list)
- Queue via Resend batch API
- Track delivery in `email_log`

---

## Phase 6: Integration & Polish (Week 7-8)

### 6.1 — Organization Onboarding Wizard

Route: `/create-org` — multi-step form:

1. **Basics:** Organization name → auto-generate slug, description
2. **Contact:** Email, phone, address
3. **Branding:** Upload logo, pick primary color
4. **Courts:** Add first court(s) with pricing
5. **Booking Rules:** Window days, slot duration, max consecutive, payment timeout
6. **Payment:** Connect HitPay API key + salt (or skip for now)
7. **Membership** (optional): Create first tier(s)
8. **Done:** Show shareable booking link, invite staff CTA

### 6.2 — Platform Landing Page

Route: `/` — replaces current single-facility homepage

- Hero: "Court booking software for pickleball clubs"
- Feature grid highlighting P0 features
- Pricing section (Thirdshot SaaS tiers)
- "Get Started Free" CTA → `/signup` → `/create-org`
- Social proof section (placeholder for future testimonials)

### 6.3 — Old Route Redirects

```typescript
// src/app/(legacy-redirects)/courts/page.tsx
import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { getUserOrgs } from "@/lib/org-context";

export default async function LegacyCourtsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  // Find user's primary org
  const supabase = await createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from("users").select("id").eq("supabase_id", user.id).single();
  if (!dbUser) redirect("/login");

  const orgs = await getUserOrgs(dbUser.id);
  if (orgs.length === 1) {
    redirect(`/o/${orgs[0].organizations.slug}/courts`);
  }
  redirect("/dashboard");
}
// Repeat pattern for /bookings, /profile, /admin
```

### 6.4 — Testing Checklist

- [ ] **Tenant isolation:** Create 2 orgs, verify data doesn't leak between them
- [ ] **RLS:** Test with anon key that non-member can't access org data
- [ ] **Booking flow:** Full E2E: public page → guest checkout → payment → confirmation
- [ ] **Member flow:** Sign up → join org → book with member discount → view bookings
- [ ] **Admin flow:** Create org → add courts → manage members → view finances
- [ ] **Billing cron:** Create subscription → fast-forward → verify invoice generated
- [ ] **Waitlist:** Book slot → cancel → verify waitlist notified
- [ ] **Old routes:** Verify `/courts`, `/bookings` redirect correctly
- [ ] **Mobile responsive:** All new pages tested on mobile viewport
- [ ] **Payment webhooks:** Verify webhook routes to correct org

---

## File Changes Summary

### New Files (~35 files)

```
-- App routes
src/app/(platform)/layout.tsx
src/app/(platform)/page.tsx                          -- SaaS landing page
src/app/(platform)/dashboard/page.tsx                -- org selector
src/app/(platform)/create-org/page.tsx               -- onboarding wizard
src/app/o/[slug]/layout.tsx                          -- org context provider
src/app/o/[slug]/(public)/layout.tsx
src/app/o/[slug]/(public)/book/page.tsx              -- public booking
src/app/o/[slug]/(public)/join/page.tsx              -- join as member
src/app/o/[slug]/(member)/layout.tsx
src/app/o/[slug]/(member)/courts/page.tsx
src/app/o/[slug]/(member)/courts/[courtId]/page.tsx
src/app/o/[slug]/(member)/bookings/page.tsx
src/app/o/[slug]/(member)/bookings/[bookingId]/page.tsx
src/app/o/[slug]/(member)/bookings/[bookingId]/pay/page.tsx
src/app/o/[slug]/(member)/bookings/[bookingId]/confirmation/page.tsx
src/app/o/[slug]/(member)/profile/page.tsx
src/app/o/[slug]/(admin)/layout.tsx
src/app/o/[slug]/(admin)/admin/page.tsx
src/app/o/[slug]/(admin)/admin/courts/page.tsx
src/app/o/[slug]/(admin)/admin/courts/new/page.tsx
src/app/o/[slug]/(admin)/admin/courts/[courtId]/edit/page.tsx
src/app/o/[slug]/(admin)/admin/courts/[courtId]/block/page.tsx
src/app/o/[slug]/(admin)/admin/members/page.tsx
src/app/o/[slug]/(admin)/admin/bookings/page.tsx
src/app/o/[slug]/(admin)/admin/finance/page.tsx
src/app/o/[slug]/(admin)/admin/settings/page.tsx
src/app/o/[slug]/(admin)/admin/audit-log/page.tsx
src/app/api/cron/process-billing/route.ts

-- Libraries
src/lib/permissions.ts
src/lib/org-context.ts
src/lib/billing/subscriptions.ts
src/lib/billing/invoices.ts

-- Types
src/types/organization.ts

-- SQL migrations (run via Supabase SQL Editor)
scripts/db/000-cleanup-orphan-tables.sql
scripts/db/001-create-organizations.sql
scripts/db/002-create-membership-tiers.sql
scripts/db/003-create-organization-members.sql
scripts/db/004-add-org-id-to-existing-tables.sql
scripts/db/005-rls-helper-functions.sql
scripts/db/006-rls-policies.sql
scripts/db/007-migrate-existing-data.sql
scripts/db/008-create-subscription-tables.sql
scripts/db/009-create-invoice-tables.sql
scripts/db/010-create-guest-waitlist-tables.sql
scripts/db/011-create-email-tables.sql
scripts/db/012-financial-rpc-functions.sql
scripts/db/013-update-existing-rpc-functions.sql
scripts/db/014-updated-at-triggers.sql
```

### Modified Files (~20 files)

```
src/types/database.ts                    -- add all new table types + org_id fields
src/types/index.ts                       -- add new type exports
src/middleware.ts                         -- multi-tenant route handling
src/lib/supabase/middleware.ts           -- (unchanged, session handling stays)
src/lib/booking/availability.ts          -- add orgId param to all functions
src/lib/booking/expire-stale-bookings.ts -- scope by org
src/lib/booking/pricing.ts              -- member discount logic
src/lib/actions/booking.ts              -- add orgId to all actions
src/lib/actions/admin.ts                -- scope by org
src/lib/actions/auth.ts                 -- after login, resolve org memberships
src/lib/actions/user.ts                 -- scope by org
src/lib/hitpay/client.ts               -- use per-org payment keys
src/lib/email/send.ts                   -- org-branded emails
src/lib/email/templates/*.tsx           -- add org branding variables
src/app/api/courts/[courtId]/availability/route.ts -- add org_id
src/app/api/webhooks/hitpay/route.ts    -- route by org
src/app/api/cron/expire-bookings/route.ts -- iterate all orgs
src/app/api/cron/send-reminders/route.ts  -- iterate all orgs
src/app/layout.tsx                       -- update for new routing
vercel.json                              -- add billing cron
```

### Deleted Files (after migration complete)

```
src/app/(main)/page.tsx                  -- replaced by platform landing
src/app/(main)/courts/...               -- moved to /o/[slug]/(member)/courts
src/app/(main)/bookings/...             -- moved to /o/[slug]/(member)/bookings
src/app/(main)/profile/...              -- moved to /o/[slug]/(member)/profile
src/app/admin/...                        -- moved to /o/[slug]/(admin)/admin
```

---

## Execution Order

| Week | Phase | Deliverable | Deploy? |
|------|-------|-------------|---------|
| 0 | DB Cleanup | Drop orphan tables | N/A |
| 1-2 | Multi-Tenancy Foundation | Org table, org_id on all tables, RLS, new routing, data migration, org context helper, update all queries | Yes |
| 3 | Roles & Permissions | Permission helpers, role checks in layouts, member management UI | Yes |
| 4 | Billing & Payments | Subscriptions, invoices, billing cron, payment webhook routing | Yes |
| 5 | Public Booking & Guests | Public booking page, guest system, waitlist | Yes |
| 6 | Finance & Comms | Revenue dashboard, email templates, announcements | Yes |
| 7-8 | Integration & Polish | Onboarding wizard, landing page, old route redirects, E2E testing | Yes |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| SQL migrations can't be run programmatically | User runs SQL in Supabase Dashboard, or authenticate `supabase` CLI once |
| RLS policies block existing functionality | All server actions use service role key (bypasses RLS). RLS only for direct client access. |
| Routing restructure breaks existing bookmarks | Old routes redirect to org-scoped equivalents |
| HitPay per-org keys need encryption | Use Supabase Vault or encrypt with app-level secret before storing |
| Type safety after schema changes | Manually update `database.ts` types after each migration |
| Multi-tenant data isolation bugs | Comprehensive test suite + RLS as safety net |

---

## Dependencies & Prerequisites

1. **Supabase SQL access** — Need ability to run migrations (Dashboard SQL Editor or CLI login)
2. **Vercel cron** — Need `vercel.json` cron config for billing (free tier: 1 cron, Pro: unlimited)
3. **Resend** — Already integrated, just need to expand templates
4. **HitPay** — Already integrated, need to support per-org API keys
5. **Recharts or similar** — Charting library for financial dashboard (new dependency)
