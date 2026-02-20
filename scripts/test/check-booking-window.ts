import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "booking_window_days")
    .single();

  console.log("Booking window days:", setting?.value || "Not found");
}

main();
