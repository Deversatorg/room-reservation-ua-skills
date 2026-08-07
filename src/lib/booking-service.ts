import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { ApiErrorCode } from "@/lib/api";
import { bookingInclude } from "@/lib/booking-dto";
import { validateBookingWindow } from "@/lib/booking-rules";
import { buildWeeklyOccurrences } from "@/lib/booking-series";
import { db } from "@/lib/db";

type CreateBookingInput = {
  roomId: string;
  title: string;
  startAt: string;
  endAt: string;
  recurrence?: { kind: "weekly"; count: number };
};

export class BookingServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "BookingServiceError";
  }
}

export async function createBookings(
  userId: string,
  input: CreateBookingInput,
  now = new Date(),
) {
  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  const occurrences = input.recurrence
    ? buildWeeklyOccurrences(startAt, endAt, input.recurrence.count)
    : [{ index: 0, startAt, endAt }];

  for (const occurrence of occurrences) {
    const violation = validateBookingWindow(occurrence.startAt, occurrence.endAt, now);
    if (violation) {
      throw new BookingServiceError(422, violation.code, violation.message, {
        [violation.field]: [violation.message],
      });
    }
  }

  const room = await db.room.findUnique({
    where: { id: input.roomId },
    select: { id: true },
  });
  if (!room) throw new BookingServiceError(404, "NOT_FOUND", "Meeting room not found.");

  try {
    const transactionResult = await db.$transaction(async (transaction) => {
      const series = input.recurrence
        ? await transaction.bookingSeries.create({
            data: {
              userId,
              roomId: room.id,
              title: input.title,
              kind: "WEEKLY",
              occurrenceCount: occurrences.length,
            },
            select: { id: true },
          })
        : null;

      const bookingIds: string[] = [];
      for (const occurrence of occurrences) {
        const conflict = await transaction.booking.findFirst({
          where: {
            roomId: room.id,
            cancelledAt: null,
            startAt: { lt: occurrence.endAt },
            endAt: { gt: occurrence.startAt },
          },
          select: { id: true },
        });
        if (conflict) {
          const date = occurrence.startAt.toLocaleDateString("en-CA", {
            timeZone: "Europe/Kyiv",
          });
          throw new BookingServiceError(
            409,
            "SLOT_OCCUPIED",
            input.recurrence
              ? `The weekly occurrence on ${date} conflicts with another booking.`
              : "This time is already booked.",
          );
        }

        const created = await transaction.booking.create({
          data: {
            roomId: room.id,
            userId,
            title: input.title,
            startAt: occurrence.startAt,
            endAt: occurrence.endAt,
            seriesId: series?.id,
            occurrenceIndex: series ? occurrence.index : undefined,
          },
          select: { id: true },
        });
        bookingIds.push(created.id);
      }

      return { bookingIds, seriesId: series?.id ?? null };
    });

    // Relation includes can require multiple SQL statements. Resolve them after
    // the interactive transaction so the adapter never overlaps work on the
    // transaction's dedicated pg client.
    const bookings = await db.booking.findMany({
      where: { id: { in: transactionResult.bookingIds } },
      include: bookingInclude,
    });
    const bookingsById = new Map(bookings.map((booking) => [booking.id, booking]));

    return {
      bookings: transactionResult.bookingIds.map((id) => bookingsById.get(id)!),
      seriesId: transactionResult.seriesId,
    };
  } catch (error) {
    if (error instanceof BookingServiceError) throw error;
    if (isOverlapConstraintError(error)) {
      throw new BookingServiceError(409, "SLOT_OCCUPIED", "This time is already booked.");
    }
    throw error;
  }
}

export async function cancelBooking(
  bookingId: string,
  userId: string,
  scope: "occurrence" | "series",
  now = new Date(),
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true, cancelledAt: true, seriesId: true, endAt: true },
  });

  if (!booking) throw new BookingServiceError(404, "NOT_FOUND", "Booking not found.");
  if (booking.userId !== userId) {
    throw new BookingServiceError(403, "FORBIDDEN", "You can only cancel your own bookings.");
  }

  if (booking.cancelledAt) return 0;

  if (scope === "series" && booking.seriesId) {
    const result = await db.booking.updateMany({
      where: {
        seriesId: booking.seriesId,
        userId,
        cancelledAt: null,
        endAt: { gt: now },
      },
      data: { cancelledAt: now },
    });
    return result.count;
  }

  if (booking.endAt <= now) {
    throw new BookingServiceError(
      422,
      "PAST_TIME",
      "Past bookings cannot be cancelled.",
    );
  }
  await db.booking.update({ where: { id: bookingId }, data: { cancelledAt: now } });
  return 1;
}

function isOverlapConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("bookings_no_active_overlap") ||
    message.includes("23P01") ||
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2004")
  );
}
