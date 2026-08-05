import { randomUUID } from "node:crypto";

import { Pool } from "pg";

export async function createNotificationFixture() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const [{ id: userId }] = (
    await pool.query<{ id: string }>(
      `SELECT "id" FROM "users" WHERE "email" = $1 LIMIT 1`,
      ["alex@room.test"],
    )
  ).rows;
  const [{ id: roomId }] = (
    await pool.query<{ id: string }>(
      `SELECT "id" FROM "rooms" WHERE "name" = $1 LIMIT 1`,
      ["Orbit"],
    )
  ).rows;

  if (!userId || !roomId) {
    await pool.end();
    throw new Error("Notification fixture requires the seeded demo user and Orbit room.");
  }

  const currentBookingId = randomUUID();
  const nextBookingId = randomUUID();
  const now = Date.now();
  const currentStart = new Date(now - 25 * 60_000);
  const handoffAt = new Date(now + 5 * 60_000);
  const nextEnd = new Date(now + 35 * 60_000);
  const suffix = randomUUID().slice(0, 8);

  await pool.query("BEGIN");
  try {
    await pool.query(
      `INSERT INTO "bookings"
        ("id", "room_id", "user_id", "title", "start_at", "end_at")
       VALUES ($1, $2, $3, $4, $5, $6), ($7, $2, $3, $8, $6, $9)`,
      [
        currentBookingId,
        roomId,
        userId,
        `Handoff current ${suffix}`,
        currentStart,
        handoffAt,
        nextBookingId,
        `Handoff next ${suffix}`,
        nextEnd,
      ],
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    await pool.end();
    throw error;
  }

  return {
    currentTitle: `Handoff current ${suffix}`,
    nextTitle: `Handoff next ${suffix}`,
    async cleanup() {
      await pool.query(
        `DELETE FROM "notifications" WHERE "current_booking_id" = $1`,
        [currentBookingId],
      );
      await pool.query(`DELETE FROM "bookings" WHERE "id" = ANY($1::uuid[])`, [
        [currentBookingId, nextBookingId],
      ]);
      await pool.end();
    },
  };
}
