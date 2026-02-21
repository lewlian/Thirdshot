import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Lazy expiration: expire all PENDING_PAYMENT bookings where expiresAt has passed.
 * Called inline before availability queries so users always see fresh slot data.
 *
 * Uses the existing expire_pending_bookings RPC function in Supabase,
 * which atomically updates bookings and their associated payments.
 *
 * @returns Number of bookings expired
 */
export async function expireStaleBookings(): Promise<number> {
  try {
    const adminClient = createAdminSupabaseClient();
    const { data, error } = await adminClient.rpc('expire_pending_bookings');

    if (error) {
      console.error("Lazy expiration error:", error);
      return 0;
    }

    const result = data as { expired_count: number; booking_ids: string[] } | null;
    return result?.expired_count ?? 0;
  } catch (error) {
    // Fail silently — availability should still work even if expiration fails
    console.error("Lazy expiration error:", error);
    return 0;
  }
}
