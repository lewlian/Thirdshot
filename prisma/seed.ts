import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log("Seeding database...");

  // Create courts - Only 2 identical courts
  const courtData = [
    {
      id: "court-1",
      name: "Court 1",
      description: "Indoor court with premium surface",
      is_indoor: true,
      has_lighting: true,
      surface_type: "SportCourt",
      price_per_hour_cents: 3000,
      peak_price_per_hour_cents: 4000,
      open_time: "07:00",
      close_time: "22:00",
      slot_duration_minutes: 60,
      is_active: true,
      sort_order: 1,
    },
    {
      id: "court-2",
      name: "Court 2",
      description: "Indoor court with premium surface",
      is_indoor: true,
      has_lighting: true,
      surface_type: "SportCourt",
      price_per_hour_cents: 3000,
      peak_price_per_hour_cents: 4000,
      open_time: "07:00",
      close_time: "22:00",
      slot_duration_minutes: 60,
      is_active: true,
      sort_order: 2,
    },
    {
      id: "court-3",
      name: "Court 3 (Inactive)",
      description: "Deactivated court",
      is_indoor: false,
      has_lighting: true,
      surface_type: "Concrete",
      price_per_hour_cents: 2000,
      peak_price_per_hour_cents: 2500,
      open_time: "07:00",
      close_time: "21:00",
      slot_duration_minutes: 60,
      is_active: false,
      sort_order: 3,
    },
    {
      id: "court-4",
      name: "Court 4 (Inactive)",
      description: "Deactivated court",
      is_indoor: false,
      has_lighting: true,
      surface_type: "Concrete",
      price_per_hour_cents: 2000,
      peak_price_per_hour_cents: 2500,
      open_time: "07:00",
      close_time: "21:00",
      slot_duration_minutes: 60,
      is_active: false,
      sort_order: 4,
    },
  ];

  for (const court of courtData) {
    const { error } = await supabase
      .from("courts")
      .upsert(court, { onConflict: "id" });

    if (error) {
      console.error(`Failed to upsert court ${court.id}:`, error);
    }
  }

  console.log(`Upserted ${courtData.length} courts`);

  // Create app settings
  const settingsData = [
    { key: "booking_window_days", value: "7", description: "Number of days in advance users can book" },
    { key: "max_consecutive_slots", value: "3", description: "Maximum number of consecutive hours per booking" },
    { key: "payment_timeout_minutes", value: "10", description: "Minutes before unpaid booking expires" },
    { key: "peak_hours_start", value: "18:00", description: "Peak pricing starts (SGT)" },
    { key: "peak_hours_end", value: "21:00", description: "Peak pricing ends (SGT)" },
    { key: "weekend_is_peak", value: "true", description: "Whether weekends use peak pricing all day" },
    { key: "facility_name", value: "PickleSG", description: "Name of the facility" },
    { key: "facility_address", value: "123 Pickleball Lane, Singapore 123456", description: "Physical address of the facility" },
    { key: "cancellation_policy_hours", value: "24", description: "Hours before booking when cancellation is free" },
  ];

  for (const setting of settingsData) {
    const { error } = await supabase
      .from("app_settings")
      .upsert(setting, { onConflict: "key" });

    if (error) {
      console.error(`Failed to upsert setting ${setting.key}:`, error);
    }
  }

  console.log(`Upserted ${settingsData.length} app settings`);

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
