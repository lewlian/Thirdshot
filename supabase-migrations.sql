-- ============================================
-- Supabase PostgreSQL Functions & Triggers
-- Run these in the Supabase SQL Editor
-- ============================================

-- Enable moddatetime extension for updated_at triggers
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ============================================
-- updated_at triggers for all tables
-- ============================================

CREATE OR REPLACE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_courts
  BEFORE UPDATE ON courts
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_bookings
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_booking_slots
  BEFORE UPDATE ON booking_slots
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_payments
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_court_blocks
  BEFORE UPDATE ON court_blocks
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_app_settings
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

CREATE OR REPLACE TRIGGER set_updated_at_saved_payment_methods
  BEFORE UPDATE ON saved_payment_methods
  FOR EACH ROW EXECUTE FUNCTION extensions.moddatetime(updated_at);

-- ============================================
-- 1. create_booking_with_slots
-- Atomic booking + slots + payment creation with availability check
-- ============================================

CREATE OR REPLACE FUNCTION create_booking_with_slots(
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
  -- Generate booking ID (cuid-like)
  v_booking_id := gen_random_uuid()::text;

  -- Check availability for each slot
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    -- Check for conflicting booking slots
    SELECT COUNT(*) INTO v_existing_count
    FROM booking_slots bs
    JOIN bookings b ON b.id = bs.booking_id
    WHERE bs.court_id = v_slot->>'court_id'
      AND bs.start_time < (v_slot->>'end_time')::timestamptz
      AND bs.end_time > (v_slot->>'start_time')::timestamptz
      AND b.status NOT IN ('CANCELLED', 'EXPIRED');

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'One or more slots are no longer available';
    END IF;

    -- Check for court blocks
    SELECT COUNT(*) INTO v_existing_count
    FROM court_blocks
    WHERE court_id = v_slot->>'court_id'
      AND start_time < (v_slot->>'end_time')::timestamptz
      AND end_time > (v_slot->>'start_time')::timestamptz;

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'Court is blocked during selected time';
    END IF;
  END LOOP;

  -- Create booking
  INSERT INTO bookings (id, user_id, type, total_cents, currency, status, expires_at, created_at, updated_at)
  VALUES (v_booking_id, p_user_id, p_type, p_total_cents, p_currency, 'PENDING_PAYMENT', p_expires_at, NOW(), NOW());

  -- Create booking slots
  INSERT INTO booking_slots (id, booking_id, court_id, start_time, end_time, price_in_cents, created_at, updated_at)
  SELECT
    gen_random_uuid()::text,
    v_booking_id,
    s->>'court_id',
    (s->>'start_time')::timestamptz,
    (s->>'end_time')::timestamptz,
    (s->>'price_in_cents')::int,
    NOW(),
    NOW()
  FROM jsonb_array_elements(p_slots) AS s;

  -- Create payment record
  INSERT INTO payments (id, booking_id, user_id, amount_cents, currency, status, created_at, updated_at)
  VALUES (gen_random_uuid()::text, v_booking_id, p_user_id, p_total_cents, p_currency, 'PENDING', NOW(), NOW());

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. confirm_booking_payment
-- Atomic booking confirmation + payment update
-- ============================================

CREATE OR REPLACE FUNCTION confirm_booking_payment(
  p_booking_id TEXT,
  p_payment_method TEXT,
  p_hitpay_reference TEXT DEFAULT NULL,
  p_webhook_payload JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Update booking status
  UPDATE bookings
  SET status = 'CONFIRMED', expires_at = NULL, updated_at = NOW()
  WHERE id = p_booking_id;

  -- Update payment
  UPDATE payments
  SET status = 'COMPLETED',
      method = p_payment_method,
      hitpay_reference_no = p_hitpay_reference,
      webhook_payload = p_webhook_payload,
      paid_at = NOW(),
      updated_at = NOW()
  WHERE booking_id = p_booking_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. expire_pending_bookings
-- Batch expire overdue bookings + payments
-- ============================================

CREATE OR REPLACE FUNCTION expire_pending_bookings()
RETURNS JSONB AS $$
DECLARE
  v_expired_ids TEXT[];
  v_count INT;
BEGIN
  -- Get expired booking IDs
  SELECT ARRAY_AGG(id) INTO v_expired_ids
  FROM bookings
  WHERE status = 'PENDING_PAYMENT'
    AND expires_at < NOW();

  IF v_expired_ids IS NULL OR array_length(v_expired_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('expired_count', 0, 'booking_ids', '[]'::jsonb);
  END IF;

  -- Expire bookings
  UPDATE bookings
  SET status = 'EXPIRED',
      cancelled_at = NOW(),
      cancel_reason = 'Payment timeout - booking expired after 10 minutes',
      updated_at = NOW()
  WHERE id = ANY(v_expired_ids);

  -- Expire payments
  UPDATE payments
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE booking_id = ANY(v_expired_ids)
    AND status = 'PENDING';

  v_count := array_length(v_expired_ids, 1);

  RETURN jsonb_build_object(
    'expired_count', v_count,
    'booking_ids', to_jsonb(v_expired_ids)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. get_profile_stats
-- Complex count queries with relation filters
-- ============================================

CREATE OR REPLACE FUNCTION get_profile_stats(p_user_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_total INT;
  v_upcoming INT;
  v_completed INT;
BEGIN
  -- Total bookings
  SELECT COUNT(*) INTO v_total
  FROM bookings WHERE user_id = p_user_id;

  -- Upcoming bookings (confirmed with future slots)
  SELECT COUNT(DISTINCT b.id) INTO v_upcoming
  FROM bookings b
  JOIN booking_slots bs ON bs.booking_id = b.id
  WHERE b.user_id = p_user_id
    AND b.status = 'CONFIRMED'
    AND bs.start_time > NOW();

  -- Completed bookings (confirmed/completed with all slots in the past)
  SELECT COUNT(*) INTO v_completed
  FROM bookings b
  WHERE b.user_id = p_user_id
    AND b.status IN ('CONFIRMED', 'COMPLETED')
    AND NOT EXISTS (
      SELECT 1 FROM booking_slots bs
      WHERE bs.booking_id = b.id AND bs.end_time >= NOW()
    );

  RETURN jsonb_build_object(
    'totalBookings', v_total,
    'upcomingBookings', v_upcoming,
    'completedBookings', v_completed
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. get_total_revenue
-- SUM of completed payment amounts
-- ============================================

CREATE OR REPLACE FUNCTION get_total_revenue()
RETURNS BIGINT AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total
  FROM payments
  WHERE status = 'COMPLETED';

  RETURN v_total;
END;
$$ LANGUAGE plpgsql;
