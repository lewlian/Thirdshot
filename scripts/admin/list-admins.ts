import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function listAdmins() {
  try {
    const { data: admins, error } = await supabase
      .from("users")
      .select("id, email, name, created_at, last_login_at")
      .eq("role", "ADMIN")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching admins:", error);
      return;
    }

    if (!admins || admins.length === 0) {
      console.log("\nNo admins found in the database.\n");
      return;
    }

    console.log(`\nFound ${admins.length} admin(s):\n`);
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name || "No name"}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   ID: ${admin.id}`);
      console.log(`   Created: ${new Date(admin.created_at).toLocaleString()}`);
      console.log(`   Last Login: ${admin.last_login_at ? new Date(admin.last_login_at).toLocaleString() : "Never"}`);
      console.log("");
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
  }
}

listAdmins();
