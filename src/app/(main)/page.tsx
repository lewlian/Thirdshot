import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CourtCard } from "@/components/common/court-card";
import { CalendarAvailability } from "@/components/booking/calendar-availability";
import { ProgramsSection } from "@/components/home/programs-section";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { getCalendarAvailability } from "@/lib/booking/aggregated-availability";
import {
  CalendarDays,
  Clock,
  MapPin,
  Zap,
  Shield,
  Users,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";

const TIMEZONE = "Asia/Singapore";

type BookingType = "COURT_BOOKING" | "CORPORATE_BOOKING" | "PRIVATE_COACHING";

const typeConfig: Record<BookingType, string> = {
  COURT_BOOKING: "Court Booking",
  CORPORATE_BOOKING: "Corporate Booking",
  PRIVATE_COACHING: "Private Coaching",
};

export default async function HomePage() {
  const user = await getUser();

  // Fetch courts
  const courts = await prisma.court.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    take: 4,
  });

  // Fetch calendar availability (7 bookable days + 1 extra day)
  const calendarAvailability = await getCalendarAvailability(true);

  // Fetch user's upcoming bookings if logged in
  let upcomingBookings: Awaited<
    ReturnType<
      typeof prisma.booking.findMany<{
        include: { slots: { include: { court: true } } };
      }>
    >
  > = [];
  if (user) {
    const dbUser = await prisma.user.findUnique({
      where: { supabaseId: user.id },
    });

    if (dbUser) {
      const bookings = await prisma.booking.findMany({
        where: {
          userId: dbUser.id,
          status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
          slots: {
            some: {
              startTime: { gte: new Date() },
            },
          },
        },
        include: {
          slots: {
            include: { court: true },
            orderBy: { startTime: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      upcomingBookings = bookings;
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section with Singapore Airlines inspired design */}
      <section className="relative overflow-hidden gradient-blue-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 relative">
          <div className="text-center max-w-3xl mx-auto text-white">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-sm font-medium mb-8 border border-white/20">
              <Zap className="h-4 w-4" />
              Singapore's Premier Pickleball Facility
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Book Your Court.
              <br />
              Game On.
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Real-time availability. Instant booking. Premium courts. Join the
              fastest growing sport in Singapore.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="rounded-full bg-white text-primary hover:bg-white/95 text-lg px-10 h-14 font-semibold shadow-lg"
                asChild
              >
                <Link href="/courts">
                  Book Now
                </Link>
              </Button>
              {!user && (
                <Button
                  size="lg"
                  className="rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/30 text-lg px-10 h-14 font-semibold"
                  asChild
                >
                  <Link href="/signup">Create Account</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Calendar Availability */}
        <section className="py-12">
          <CalendarAvailability availability={calendarAvailability} />
        </section>

        {/* Programs & Services */}
        <section className="py-12 border-t border-gray-200">
          <ProgramsSection />
        </section>

        {/* Upcoming Bookings (for logged in users) */}
        {user && upcomingBookings.length > 0 && (
          <section className="py-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Your Upcoming Games</h2>
                <p className="text-muted-foreground">
                  Ready to play? Here&apos;s what&apos;s coming up.
                </p>
              </div>
              <Button variant="ghost" className="rounded-full" asChild>
                <Link href="/bookings">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingBookings.map((booking) => {
                const firstSlot = booking.slots[0];
                const bookingTypeLabel = typeConfig[booking.type as BookingType] || booking.type;
                const firstSlotStartSGT = firstSlot ? toZonedTime(firstSlot.startTime, TIMEZONE) : new Date();

                return (
                  <Card
                    key={booking.id}
                    className="group hover:shadow-lg transition-all hover:-translate-y-1 border-border/50"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-2">
                          <CardTitle className="text-lg">{bookingTypeLabel}</CardTitle>
                          <Badge variant="outline" className="w-fit text-xs">
                            {bookingTypeLabel}
                          </Badge>
                        </div>
                        <Badge
                          variant={booking.status === "PENDING_PAYMENT" ? "secondary" : "default"}
                        >
                          {booking.status === "PENDING_PAYMENT" ? "Pending" : "Confirmed"}
                        </Badge>
                      </div>
                      <CardDescription className="pt-2">
                        {firstSlot
                          ? format(firstSlotStartSGT, "EEEE, d MMMM yyyy")
                          : "N/A"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Display all slots */}
                      <div className="space-y-2">
                        {booking.slots.map((slot) => {
                          const slotStartSGT = toZonedTime(slot.startTime, TIMEZONE);
                          const slotEndSGT = toZonedTime(slot.endTime, TIMEZONE);

                          return (
                            <div key={slot.id} className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-xs">{slot.court.name}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-muted-foreground text-xs">
                                {format(slotStartSGT, "h:mm a")} - {format(slotEndSGT, "h:mm a")}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-full group-hover:bg-gray-900 group-hover:text-white transition-colors"
                        asChild
                      >
                        <Link href={`/bookings/${booking.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}


        {/* Features */}
        <section className="py-16 border-t border-border/50">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Why Thirdshot?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-base">
              We're building the best pickleball experience in Singapore
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center group">
              <div className="bg-primary/5 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                <Zap className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2.5">Instant Booking</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                Book your court in seconds. Real-time availability updates.
              </p>
            </div>
            <div className="text-center group">
              <div className="bg-primary/5 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2.5">Premium Courts</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                Professional-grade surfaces, indoor and outdoor options.
              </p>
            </div>
            <div className="text-center group">
              <div className="bg-primary/5 rounded-3xl w-20 h-20 flex items-center justify-center mx-auto mb-5 group-hover:scale-105 transition-transform">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2.5">Growing Community</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                Join Singapore's fastest growing pickleball community.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 mb-8">
          <div className="gradient-blue-bg rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden card-elevated">
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Play?
              </h2>
              <p className="text-white/90 mb-10 max-w-xl mx-auto text-lg leading-relaxed">
                Book your first court today and experience the thirdshot
                difference.
              </p>
              <Button
                size="lg"
                className="rounded-full bg-white text-primary hover:bg-white/95 text-lg px-10 h-14 font-semibold shadow-lg"
                asChild
              >
                <Link href="/courts">
                  Book a Court
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
