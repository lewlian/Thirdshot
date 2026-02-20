import { addHours, addDays } from 'date-fns';

async function fixBookingsWithoutSlots() {
  // Load Next.js environment variables
  const { loadEnvConfig } = await import('@next/env');
  const projectDir = process.cwd();
  loadEnvConfig(projectDir);

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log('Finding bookings without slots...');

  // Find all bookings
  const { data: allBookings } = await supabase
    .from('bookings')
    .select('*, booking_slots(id)');

  // Filter to those without slots
  const bookingsWithoutSlots = (allBookings || []).filter(
    (b) => !b.booking_slots || b.booking_slots.length === 0
  );

  console.log(`Found ${bookingsWithoutSlots.length} bookings without slots`);

  if (bookingsWithoutSlots.length === 0) {
    console.log('No bookings to fix!');
    return;
  }

  // Get the first available court
  const { data: court } = await supabase
    .from('courts')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
    .limit(1)
    .single();

  if (!court) {
    console.error('No active court found!');
    return;
  }

  console.log(`Using court: ${court.name}`);

  // Fix each booking by adding a placeholder slot
  for (const booking of bookingsWithoutSlots) {
    console.log(`\nFixing booking ${booking.id}...`);
    console.log(`  Status: ${booking.status}`);
    console.log(`  Created: ${booking.created_at}`);

    const slotStart = addDays(new Date(booking.created_at), 1);
    const slotEnd = addHours(slotStart, 1);

    try {
      const { error } = await supabase
        .from('booking_slots')
        .insert({
          booking_id: booking.id,
          court_id: court.id,
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          price_in_cents: booking.total_cents,
        });

      if (error) throw error;
      console.log(`  Added slot: ${slotStart.toISOString()} - ${slotEnd.toISOString()}`);
    } catch (error) {
      console.error(`  Failed to add slot:`, error);
    }
  }

  console.log('\nDone!');
}

fixBookingsWithoutSlots()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
