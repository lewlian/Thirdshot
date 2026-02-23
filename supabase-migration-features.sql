-- ============================================
-- Feature Migrations: Public Club Page, Digital Waivers, Recurring Bookings
-- Run these in the Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. Public Club Page - Add columns to organizations
-- ============================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS operating_hours JSONB DEFAULT '{"mon":"07:00-22:00","tue":"07:00-22:00","wed":"07:00-22:00","thu":"07:00-22:00","fri":"07:00-22:00","sat":"08:00-22:00","sun":"08:00-22:00"}';

-- ============================================
-- 2. Digital Waivers
-- ============================================

CREATE TABLE IF NOT EXISTS waivers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS waiver_signatures (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  waiver_id TEXT NOT NULL REFERENCES waivers(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(waiver_id, user_id)
);

-- RLS for waivers
ALTER TABLE waivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waivers_org_read" ON waivers
  FOR SELECT USING (true);

CREATE POLICY "waivers_org_write" ON waivers
  FOR ALL USING (true);

-- RLS for waiver_signatures
ALTER TABLE waiver_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "waiver_signatures_org_read" ON waiver_signatures
  FOR SELECT USING (true);

CREATE POLICY "waiver_signatures_org_write" ON waiver_signatures
  FOR ALL USING (true);

-- Triggers for updated_at
CREATE OR REPLACE TRIGGER set_updated_at_waivers
  BEFORE UPDATE ON waivers
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================
-- 3. Recurring Bookings
-- ============================================

CREATE TABLE IF NOT EXISTS recurring_bookings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  created_by_id TEXT NOT NULL REFERENCES users(id),
  court_id TEXT NOT NULL REFERENCES courts(id),
  title TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'weekly',
  skip_dates DATE[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link bookings to recurring parent
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurring_booking_id TEXT REFERENCES recurring_bookings(id);

-- RLS for recurring_bookings
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recurring_bookings_org_read" ON recurring_bookings
  FOR SELECT USING (true);

CREATE POLICY "recurring_bookings_org_write" ON recurring_bookings
  FOR ALL USING (true);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_updated_at_recurring_bookings
  BEFORE UPDATE ON recurring_bookings
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);
