import { Prisma } from "@/generated/prisma/client";
import { apiError, readJson, zodError } from "@/lib/api";
import { bookingDto, bookingInclude } from "@/lib/booking-dto";
import { validateBookingWindow } from "@/lib/booking-rules";
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

  const startAt = new Date(result.data.startAt);
  const endAt = new Date(result.data.endAt);
  const violation = validateBookingWindow(startAt, endAt);

  if (violation) {
    return apiError(422, violation.code, violation.message, {
      [violation.field]: [violation.message],
    });
  }

  const room = await db.room.findUnique({
    where: { id: result.data.roomId },
    select: { id: true },
  });
  if (!room) return apiError(404, "NOT_FOUND", "Meeting room not found.");

  const conflict = await db.booking.findFirst({
    where: {
      roomId: room.id,
      cancelledAt: null,
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
    select: { id: true },
  });

  if (conflict) {
    return apiError(409, "SLOT_OCCUPIED", "This time is already booked.");
  }

  try {
    const booking = await db.booking.create({
      data: {
        roomId: room.id,
        userId: user.id,
        title: result.data.title,
        startAt,
        endAt,
      },
      include: bookingInclude,
    });

    return Response.json({ booking: bookingDto(booking, user.id) }, { status: 201 });
  } catch (error) {
    if (isOverlapConstraintError(error)) {
      return apiError(409, "SLOT_OCCUPIED", "This time is already booked.");
    }

    console.error("Booking creation failed", error);
    return apiError(500, "SERVER_ERROR", "Could not create the booking.");
  }
}

function isOverlapConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("bookings_no_active_overlap") ||
    message.includes("23P01") ||
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004")
  );
}
