"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/supabase/server";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional().nullable(),
});

export type ProfileActionResult = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return { error: "User not found" };
  }

  const rawData = {
    name: formData.get("name") as string,
    phone: (formData.get("phone") as string) || null,
  };

  const parsed = updateProfileSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}

export async function getProfileStats() {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
  });

  if (!dbUser) {
    return null;
  }

  const [totalBookings, upcomingBookings, completedBookings] = await Promise.all([
    prisma.booking.count({
      where: { userId: dbUser.id },
    }),
    prisma.booking.count({
      where: {
        userId: dbUser.id,
        status: "CONFIRMED",
        slots: {
          some: {
            startTime: { gt: new Date() },
          },
        },
      },
    }),
    prisma.booking.count({
      where: {
        userId: dbUser.id,
        status: { in: ["CONFIRMED", "COMPLETED"] },
        slots: {
          every: {
            endTime: { lt: new Date() },
          },
        },
      },
    }),
  ]);

  return {
    totalBookings,
    upcomingBookings,
    completedBookings,
  };
}
