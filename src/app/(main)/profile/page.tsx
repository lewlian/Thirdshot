import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { getProfileStats } from "@/lib/actions/user";
import { getSavedPaymentMethod } from "@/lib/actions/payment-methods";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Clock, Shield } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { PaymentMethodsSection } from "./payment-methods-section";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    redirect("/login");
  }

  const stats = await getProfileStats();
  const savedCard = await getSavedPaymentMethod();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="space-y-6">
        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your profile details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              defaultValues={{
                name: dbUser.name || "",
                email: dbUser.email,
                phone: dbUser.phone || "",
              }}
            />
          </CardContent>
        </Card>

        {/* Booking Stats */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Booking Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Calendar className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{stats.totalBookings}</p>
                  <p className="text-xs text-muted-foreground">Total Bookings</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-2xl font-bold">{stats.completedBookings}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Methods */}
        <PaymentMethodsSection savedCard={savedCard} />

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{dbUser.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Account type</span>
              {dbUser.role === "ADMIN" ? (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              ) : (
                <span className="capitalize">{dbUser.role.toLowerCase()}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
