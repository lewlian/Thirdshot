-- pg_cron background cleanup for expired bookings
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
--
-- This is a safety net that runs every 5 minutes in the database.
-- The primary expiration happens lazily in the app (on availability queries),
-- so this just catches edge cases where no one queries for a while.
--
-- It reuses the existing expire_pending_bookings() RPC function.

-- Enable pg_cron if not already enabled (Supabase has it built-in)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the existing RPC to run every 5 minutes
SELECT cron.schedule(
  'expire-stale-bookings',    -- job name
  '*/5 * * * *',              -- every 5 minutes
  'SELECT expire_pending_bookings()'
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'expire-stale-bookings';
