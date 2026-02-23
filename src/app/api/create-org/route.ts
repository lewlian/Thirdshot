import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getUser } from "@/lib/supabase/server";
import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  description: z.string().max(500).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(2).default("SG"),
  timezone: z.string().default("Asia/Singapore"),
  currency: z.string().max(3).default("SGD"),
  primaryColor: z.string().default("#16a34a"),
  bookingWindowDays: z.number().min(1).max(90).default(14),
  slotDurationMinutes: z.number().min(15).max(180).default(60),
  maxConsecutiveSlots: z.number().min(1).max(10).default(3),
  paymentTimeoutMinutes: z.number().min(5).max(60).default(15),
  allowGuestBookings: z.boolean().default(true),
  courts: z
    .array(
      z.object({
        name: z.string().min(1),
        hourlyRate: z.number().min(0),
      })
    )
    .min(1, "At least one court is required"),
});

export async function POST(request: NextRequest) {
  try {
    const supabaseUser = await getUser();
    if (!supabaseUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Check super admin (platform-level ADMIN role)
    const { data: dbUser } = await supabase
      .from("users")
      .select("id, role")
      .eq("supabase_id", supabaseUser.id)
      .single();

    if (!dbUser) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    if (dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only platform administrators can create organizations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", data.slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This URL slug is already taken" },
        { status: 409 }
      );
    }

    // Create organization
    const orgId = crypto.randomUUID();
    const { error: orgError } = await supabase.from("organizations").insert({
      id: orgId,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      country: data.country,
      timezone: data.timezone,
      currency: data.currency,
      primary_color: data.primaryColor,
      booking_window_days: data.bookingWindowDays,
      slot_duration_minutes: data.slotDurationMinutes,
      max_consecutive_slots: data.maxConsecutiveSlots,
      payment_timeout_minutes: data.paymentTimeoutMinutes,
      allow_guest_bookings: data.allowGuestBookings,
      plan: "free",
      is_active: true,
    });

    if (orgError) {
      console.error("Create org error:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization" },
        { status: 500 }
      );
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        id: crypto.randomUUID(),
        organization_id: orgId,
        user_id: dbUser.id,
        role: "owner",
        membership_status: "active",
      });

    if (memberError) {
      console.error("Add owner error:", memberError);
      // Clean up org
      await supabase.from("organizations").delete().eq("id", orgId);
      return NextResponse.json(
        { error: "Failed to set up organization" },
        { status: 500 }
      );
    }

    // Create courts
    const courtInserts = data.courts.map((court, i) => ({
      id: crypto.randomUUID(),
      organization_id: orgId,
      name: court.name,
      price_per_hour_cents: court.hourlyRate * 100,
      peak_price_per_hour_cents: Math.round(court.hourlyRate * 1.5 * 100),
      is_active: true,
      sort_order: i,
      open_time: "07:00",
      close_time: "22:00",
    }));

    const { error: courtsError } = await supabase
      .from("courts")
      .insert(courtInserts);

    if (courtsError) {
      console.error("Create courts error:", courtsError);
      // Non-fatal — org is still created, user can add courts later
    }

    // Create a default membership tier
    await supabase.from("membership_tiers").insert({
      id: crypto.randomUUID(),
      organization_id: orgId,
      name: "Member",
      description: "Standard membership",
      price_cents: 0,
      billing_period: "monthly",
      booking_discount_percent: 0,
      can_book_peak_hours: true,
      priority_booking: false,
      max_advance_booking_days: data.bookingWindowDays,
      guest_passes_per_month: 0,
      is_active: true,
      sort_order: 0,
    });

    // Create default waiver
    await supabase.from("waivers").insert({
      id: crypto.randomUUID(),
      organization_id: orgId,
      title: "Liability Waiver",
      content: `ASSUMPTION OF RISK AND WAIVER OF LIABILITY

I acknowledge that participation in pickleball and related activities involves inherent risks, including but not limited to:

- Physical injuries including sprains, strains, fractures, and other bodily harm
- Contact with other participants, equipment, or court surfaces
- Exposure to weather conditions
- Cardiovascular incidents

I voluntarily assume all risks associated with my participation in pickleball activities at this facility.

I hereby release, waive, and discharge the facility, its owners, operators, employees, and agents from any and all liability, claims, demands, and causes of action arising from my participation in pickleball activities.

I confirm that I am physically fit and have no medical conditions that would prevent my safe participation.

I have read this waiver, understand its terms, and sign it voluntarily.`,
      version: 1,
      is_active: false, // Disabled by default, admin enables when ready
    });

    // Create audit log
    await supabase.from("admin_audit_logs").insert({
      id: crypto.randomUUID(),
      organization_id: orgId,
      admin_id: dbUser.id,
      action: "CREATE_ORGANIZATION",
      entity_type: "organization",
      entity_id: orgId,
      new_data: { name: data.name, slug: data.slug },
    });

    return NextResponse.json({ success: true, slug: data.slug, orgId });
  } catch (error) {
    console.error("Create org error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
