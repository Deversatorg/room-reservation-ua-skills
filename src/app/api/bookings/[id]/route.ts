import { z } from "zod";

import { apiError } from "@/lib/api";
import { BookingServiceError, cancelBooking } from "@/lib/booking-service";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return apiError(404, "NOT_FOUND", "Booking not found.");
  }
  const scopeResult = z
    .enum(["occurrence", "series"])
    .safeParse(new URL(request.url).searchParams.get("scope") ?? "occurrence");
  if (!scopeResult.success) {
    return apiError(422, "VALIDATION_ERROR", "Choose a valid cancellation scope.");
  }

  try {
    const cancelledCount = await cancelBooking(id, user.id, scopeResult.data);
    return Response.json({ cancelledCount });
  } catch (error) {
    if (error instanceof BookingServiceError) {
      return apiError(error.status, error.code, error.message, error.fieldErrors);
    }
    console.error("Booking cancellation failed", error);
    return apiError(500, "SERVER_ERROR", "Could not cancel the booking.");
  }
}
