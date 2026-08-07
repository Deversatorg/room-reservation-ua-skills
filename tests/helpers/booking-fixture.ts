import { randomUUID } from "node:crypto";

import { Pool } from "pg";

export async function createPastBookingFixture() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const [{ userId, roomId }] = (
    await pool.query<{ userId: string; roomId: string }>(
      `SELECT users."id" AS "userId", rooms."id" AS "roomId"
       FROM "users" AS users
       CROSS JOIN "rooms" AS rooms
       WHERE users."email" = $1 AND rooms."name" = $2
       LIMIT 1`,
      ["alex@room.test", "Horizon"],
    )
  ).rows;

  if (!userId || !roomId) {
    await pool.end();
    throw new Error("Past booking fixture requires Alex and the Horizon room.");
  }

  const bookingId = randomUUID();
  const endAt = new Date(Date.now() - 60 * 60_000);
  const startAt = new Date(endAt.getTime() - 60 * 60_000);

  await pool.query(
    `INSERT INTO "bookings"
      ("id", "room_id", "user_id", "title", "start_at", "end_at")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [bookingId, roomId, userId, "Immutable past booking", startAt, endAt],
  );

  return {
    bookingId,
    roomId,
    startAt,
    endAt,
    async wasCancelled() {
      const [booking] = (
        await pool.query<{ cancelledAt: Date | null }>(
          `SELECT "cancelled_at" AS "cancelledAt" FROM "bookings" WHERE "id" = $1`,
          [bookingId],
        )
      ).rows;
      return Boolean(booking?.cancelledAt);
    },
    async cleanup() {
      await pool.query(`DELETE FROM "bookings" WHERE "id" = $1`, [bookingId]);
      await pool.end();
    },
  };
}
