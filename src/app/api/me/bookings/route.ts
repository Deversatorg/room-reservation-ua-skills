import { z } from "zod";

import { apiError } from "@/lib/api";
import { bookingDto, bookingInclude } from "@/lib/booking-dto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const querySchema = z.object({
  status: z.enum(["upcoming", "past"]),
  cursor: z.string().uuid().optional(),
});

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  const url = new URL(request.url);
  const result = querySchema.safeParse({
    status: url.searchParams.get("status"),
    cursor: url.searchParams.get("cursor") ?? undefined,
  });
  if (!result.success) {
    return apiError(422, "VALIDATION_ERROR", "Choose a valid booking list.");
  }

  const now = new Date();
  const isPast = result.data.status === "past";
  const bookings = await db.booking.findMany({
    where: {
      userId: user.id,
      cancelledAt: null,
      ...(isPast ? { endAt: { lte: now } } : { endAt: { gt: now } }),
    },
    include: bookingInclude,
    orderBy: [{ startAt: isPast ? "desc" : "asc" }, { id: "asc" }],
    take: isPast ? PAGE_SIZE + 1 : 100,
    ...(result.data.cursor
      ? { cursor: { id: result.data.cursor }, skip: 1 }
      : {}),
  });

  const hasMore = isPast && bookings.length > PAGE_SIZE;
  const page = hasMore ? bookings.slice(0, PAGE_SIZE) : bookings;

  return Response.json({
    bookings: page.map((booking) => bookingDto(booking, user.id)),
    nextCursor: hasMore ? page.at(-1)?.id : null,
  });
}
