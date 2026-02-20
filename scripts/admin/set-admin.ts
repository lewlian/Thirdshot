// Set a user as admin
// Run with: npx tsx scripts/admin/set-admin.ts <email>

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error("Usage: npx tsx scripts/admin/set-admin.ts <email>");
    process.exit(1);
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, role")
    .eq("email", email)
    .single();

  if (error || !user) {
    console.error(`User with email "${email}" not found`);
    process.exit(1);
  }

  if (user.role === "ADMIN") {
    console.log(`User "${email}" is already an admin`);
    process.exit(0);
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ role: "ADMIN" })
    .eq("email", email);

  if (updateError) {
    console.error("Failed to update user:", updateError);
    process.exit(1);
  }

  console.log(`Successfully set "${email}" as admin`);
}

main().catch(console.error);
