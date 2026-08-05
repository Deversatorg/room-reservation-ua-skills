import { apiError, readJson, zodError } from "@/lib/api";
import { bookingDto, bookingInclude } from "@/lib/booking-dto";
import { BookingServiceError, createBookings } from "@/lib/booking-service";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { bookingRangeSchema, createBookingSchema } from "@/lib/validation";

const MAX_RANGE_MS = 8 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  const url = new URL(request.url);
  const result = bookingRangeSchema.safeParse({
    roomId: url.searchParams.get("roomId"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });
  if (!result.success) return zodError(result.error);

  const from = new Date(result.data.from);
  const to = new Date(result.data.to);
  const rangeLength = to.getTime() - from.getTime();

  if (rangeLength <= 0 || rangeLength > MAX_RANGE_MS) {
    return apiError(
      422,
      "VALIDATION_ERROR",
      "Choose a valid schedule range of at most eight days.",
    );
  }

  const bookings = await db.booking.findMany({
    where: {
      roomId: result.data.roomId,
      cancelledAt: null,
      startAt: { lt: to },
      endAt: { gt: from },
    },
    include: bookingInclude,
    orderBy: { startAt: "asc" },
  });

  return Response.json({
    bookings: bookings.map((booking) => bookingDto(booking, user.id)),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");
  if (!user.emailVerified) {
    return apiError(
      403,
      "EMAIL_VERIFICATION_REQUIRED",
      "Verify your email address before booking a room.",
    );
  }

  const input = await readJson(request);
  const result = createBookingSchema.safeParse(input);
  if (!result.success) return zodError(result.error);

  try {
    const created = await createBookings(user.id, result.data);
    return Response.json(
      {
        bookings: created.bookings.map((booking) => bookingDto(booking, user.id)),
        seriesId: created.seriesId,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof BookingServiceError) {
      return apiError(error.status, error.code, error.message, error.fieldErrors);
    }

    console.error("Booking creation failed", error);
    return apiError(500, "SERVER_ERROR", "Could not create the booking.");
  }
}
