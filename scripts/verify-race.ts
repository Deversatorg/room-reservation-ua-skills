import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { DateTime } from "luxon";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [room, users] = await Promise.all([
    prisma.room.findFirst({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { email: "asc" }, take: 2 }),
  ]);

  if (!room || users.length < 2) {
    throw new Error("Seed the database before running the race verification.");
  }

  const startAt = DateTime.now()
    .setZone("Europe/Kyiv")
    .startOf("week")
    .plus({ weeks: 2, days: 1, hours: 12 })
    .toUTC()
    .toJSDate();
  const endAt = DateTime.fromJSDate(startAt).plus({ hours: 1 }).toJSDate();
  const title = "Race verification";

  await prisma.booking.deleteMany({
    where: { roomId: room.id, title, startAt },
  });

  const results = await Promise.allSettled(
    users.map((user) =>
      prisma.booking.create({
        data: { roomId: room.id, userId: user.id, title, startAt, endAt },
      }),
    ),
  );
  const winners = results.filter((result) => result.status === "fulfilled");
  const stored = await prisma.booking.count({
    where: { roomId: room.id, title, startAt, cancelledAt: null },
  });

  await prisma.booking.deleteMany({
    where: { roomId: room.id, title, startAt },
  });

  if (winners.length !== 1 || stored !== 1) {
    throw new Error(`Race protection failed: ${winners.length} winners, ${stored} rows.`);
  }

  console.info("Race protection verified: two requests, one stored booking.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
