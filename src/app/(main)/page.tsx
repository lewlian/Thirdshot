import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import {
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  Globe,
  Shield,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart Booking",
    description:
      "Real-time court availability, configurable time slots, and automatic conflict prevention.",
  },
  {
    icon: Users,
    title: "Member Management",
    description:
      "Membership tiers, role-based access, guest bookings, and member directories.",
  },
  {
    icon: CreditCard,
    title: "Payments & Billing",
    description:
      "Integrated payments, recurring subscriptions, invoicing, and automated billing.",
  },
  {
    icon: BarChart3,
    title: "Financial Reporting",
    description:
      "Revenue dashboards, member growth analytics, and court utilization insights.",
  },
  {
    icon: Globe,
    title: "Public Booking Pages",
    description:
      "Shareable booking links for guests. No account required to book a court.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant Platform",
    description:
      "Each club gets its own branded space with isolated data and custom settings.",
  },
];

export default async function HomePage() {
  // Redirect logged-in users to the dashboard
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="text-center max-w-3xl mx-auto text-white">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Court booking software for pickleball clubs
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed">
              Manage courts, bookings, and members all in one place. Real-time
              availability, instant booking, and seamless payments.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="rounded-full bg-white text-primary hover:bg-white/95 text-lg px-10 h-14 font-semibold shadow-lg"
                asChild
              >
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button
                size="lg"
                className="rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border border-white/30 text-lg px-10 h-14 font-semibold"
                asChild
              >
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything your club needs
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From court scheduling to member management, Thirdshot handles the
              operations so you can focus on growing your community.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <feature.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to streamline your club?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Set up your club in minutes. No credit card required.
          </p>
          <Button size="lg" className="rounded-full text-lg px-8 h-12" asChild>
            <Link href="/signup">Get Started Free</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
