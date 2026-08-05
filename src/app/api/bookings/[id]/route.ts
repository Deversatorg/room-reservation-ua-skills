import { z } from "zod";

import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return apiError(404, "NOT_FOUND", "Booking not found.");
  }

  const booking = await db.booking.findUnique({
    where: { id },
    select: { userId: true, cancelledAt: true },
  });

  if (!booking) return apiError(404, "NOT_FOUND", "Booking not found.");
  if (booking.userId !== user.id) {
    return apiError(403, "FORBIDDEN", "You can only cancel your own bookings.");
  }

  if (!booking.cancelledAt) {
    await db.booking.update({
      where: { id },
      data: { cancelledAt: new Date() },
    });
  }

  return new Response(null, { status: 204 });
}
