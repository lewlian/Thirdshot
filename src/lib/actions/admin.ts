"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAdminUser } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Court schemas
const courtSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  pricePerHourCents: z.number().min(0, "Price must be positive"),
  isActive: z.boolean().default(true),
});

const courtBlockSchema = z.object({
  courtId: z.string().min(1, "Court ID is required"),
  startTime: z.date(),
  endTime: z.date(),
  reason: z.enum(["MAINTENANCE", "TOURNAMENT", "PRIVATE_EVENT", "OTHER"]),
});

// Create audit log entry
async function createAuditLog(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  options?: {
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    notes?: string;
  }
) {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      previousData: options?.previousData ? (options.previousData as Prisma.InputJsonValue) : undefined,
      newData: options?.newData ? (options.newData as Prisma.InputJsonValue) : undefined,
      notes: options?.notes || null,
    },
  });
}

// Court CRUD operations
export async function createCourt(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const data = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    pricePerHourCents: Math.round(
      parseFloat(formData.get("pricePerHour") as string) * 100
    ),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = courtSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const court = await prisma.court.create({
      data: parsed.data,
    });

    await createAuditLog(admin.id, "CREATE", "Court", court.id, {
      newData: { name: court.name },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true, court };
  } catch (error) {
    console.error("Failed to create court:", error);
    return { success: false, error: "Failed to create court" };
  }
}

export async function updateCourt(courtId: string, formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const data = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
    pricePerHourCents: Math.round(
      parseFloat(formData.get("pricePerHour") as string) * 100
    ),
    isActive: formData.get("isActive") === "true",
  };

  const parsed = courtSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const court = await prisma.court.update({
      where: { id: courtId },
      data: parsed.data,
    });

    await createAuditLog(admin.id, "UPDATE", "Court", court.id, {
      newData: { name: court.name, changes: data },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true, court };
  } catch (error) {
    console.error("Failed to update court:", error);
    return { success: false, error: "Failed to update court" };
  }
}

export async function deleteCourt(courtId: string) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Check for existing bookings by querying booking slots
    const bookingSlotsCount = await prisma.bookingSlot.count({
      where: {
        courtId,
        booking: {
          status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        },
      },
    });

    if (bookingSlotsCount > 0) {
      return {
        success: false,
        error: `Cannot delete court with ${bookingSlotsCount} active booking slots. Deactivate it instead.`,
      };
    }

    const court = await prisma.court.delete({
      where: { id: courtId },
    });

    await createAuditLog(admin.id, "DELETE", "Court", courtId, {
      previousData: { name: court.name },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete court:", error);
    return { success: false, error: "Failed to delete court" };
  }
}

// Court blocking
export async function createCourtBlock(formData: FormData) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  const data = {
    courtId: formData.get("courtId") as string,
    startTime: new Date(formData.get("startTime") as string),
    endTime: new Date(formData.get("endTime") as string),
    reason: (formData.get("reason") as string) || "OTHER",
  };

  const parsed = courtBlockSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  if (parsed.data.startTime >= parsed.data.endTime) {
    return { success: false, error: "End time must be after start time" };
  }

  try {
    // Check for conflicting booking slots
    const conflictingSlot = await prisma.bookingSlot.findFirst({
      where: {
        courtId: parsed.data.courtId,
        startTime: { lt: parsed.data.endTime },
        endTime: { gt: parsed.data.startTime },
        booking: {
          status: "CONFIRMED",
        },
      },
    });

    if (conflictingSlot) {
      return {
        success: false,
        error: "There are existing bookings during this time period",
      };
    }

    const block = await prisma.courtBlock.create({
      data: {
        courtId: parsed.data.courtId,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        reason: parsed.data.reason,
        createdById: admin.id,
      },
    });

    await createAuditLog(admin.id, "CREATE", "CourtBlock", block.id, {
      newData: {
        courtId: parsed.data.courtId,
        startTime: parsed.data.startTime.toISOString(),
        endTime: parsed.data.endTime.toISOString(),
        reason: parsed.data.reason,
      },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true, block };
  } catch (error) {
    console.error("Failed to create court block:", error);
    return { success: false, error: "Failed to create court block" };
  }
}

export async function deleteCourtBlock(blockId: string) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const block = await prisma.courtBlock.delete({
      where: { id: blockId },
    });

    await createAuditLog(admin.id, "DELETE", "CourtBlock", blockId, {
      previousData: { courtId: block.courtId },
    });

    revalidatePath("/admin/courts");
    revalidatePath("/book");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete court block:", error);
    return { success: false, error: "Failed to delete court block" };
  }
}

// Admin booking management
export async function adminCancelBooking(bookingId: string, reason?: string) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: {
        user: true,
        slots: {
          include: { court: true },
        },
      },
    });

    await createAuditLog(admin.id, "CANCEL", "Booking", bookingId, {
      newData: {
        reason,
        userId: booking.userId,
        slotCount: booking.slots.length,
      },
    });

    revalidatePath("/admin/bookings");

    return { success: true, booking };
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return { success: false, error: "Failed to cancel booking" };
  }
}

// User management
export async function updateUserRole(
  userId: string,
  role: "USER" | "ADMIN"
) {
  const admin = await getAdminUser();
  if (!admin) {
    return { success: false, error: "Unauthorized" };
  }

  // Prevent removing own admin access
  if (userId === admin.id && role === "USER") {
    return { success: false, error: "Cannot remove your own admin access" };
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await createAuditLog(admin.id, "UPDATE_ROLE", "User", userId, {
      newData: { newRole: role },
    });

    revalidatePath("/admin/users");

    return { success: true, user };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { success: false, error: "Failed to update user role" };
  }
}
