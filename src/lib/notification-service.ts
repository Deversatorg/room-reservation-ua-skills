import "server-only";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { parseNotifyBeforeMinutes } from "@/lib/notification-rules";

type CandidateRow = {
  currentBookingId: string;
  nextBookingId: string;
};

const notificationInclude = {
  currentBooking: {
    select: {
      title: true,
      endAt: true,
      room: { select: { name: true } },
    },
  },
  nextBooking: { select: { title: true } },
} as const;

export async function pollNotifications(userId: string, now = new Date()) {
  const notifyBeforeMinutes = parseNotifyBeforeMinutes(
    process.env.NOTIFY_BEFORE_MINUTES,
  );
  const notifyUntil = new Date(now.getTime() + notifyBeforeMinutes * 60_000);

  const created = await db.$transaction(async (transaction) => {
    const candidates = await transaction.$queryRaw<CandidateRow[]>`
      SELECT current_booking."id" AS "currentBookingId",
             next_booking."id" AS "nextBookingId"
      FROM "bookings" AS current_booking
      INNER JOIN "bookings" AS next_booking
        ON next_booking."room_id" = current_booking."room_id"
       AND next_booking."start_at" = current_booking."end_at"
       AND next_booking."cancelled_at" IS NULL
      LEFT JOIN "notifications" AS existing
        ON existing."current_booking_id" = current_booking."id"
      WHERE current_booking."user_id" = ${userId}::uuid
        AND current_booking."cancelled_at" IS NULL
        AND current_booking."end_at" > ${now}
        AND current_booking."end_at" <= ${notifyUntil}
        AND existing."id" IS NULL
      FOR UPDATE OF current_booking, next_booking SKIP LOCKED
    `;

    if (candidates.length === 0) return [];
    const rows = candidates.map((candidate) => ({
      id: randomUUID(),
      userId,
      currentBookingId: candidate.currentBookingId,
      nextBookingId: candidate.nextBookingId,
      deliveredAt: now,
      createdAt: now,
    }));

    await transaction.notification.createMany({ data: rows, skipDuplicates: true });
    return transaction.notification.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
      include: notificationInclude,
      orderBy: { deliveredAt: "desc" },
    });
  });

  return created.map(notificationDto);
}

export async function listNotifications(userId: string) {
  const notifications = await db.notification.findMany({
    where: { userId },
    include: notificationInclude,
    orderBy: { deliveredAt: "desc" },
    take: 20,
  });
  return notifications.map(notificationDto);
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const result = await db.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

function notificationDto(notification: {
  id: string;
  deliveredAt: Date;
  readAt: Date | null;
  currentBooking: { title: string; endAt: Date; room: { name: string } };
  nextBooking: { title: string };
}) {
  return {
    id: notification.id,
    currentTitle: notification.currentBooking.title,
    nextTitle: notification.nextBooking.title,
    roomName: notification.currentBooking.room.name,
    endAt: notification.currentBooking.endAt.toISOString(),
    deliveredAt: notification.deliveredAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}
