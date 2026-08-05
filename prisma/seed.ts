import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";
import { DateTime } from "luxon";

import { PrismaClient } from "../src/generated/prisma/client";

const OFFICE_TIME_ZONE = "Europe/Kyiv";
const DEMO_PASSWORD = "DemoPass123!";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const rooms = [
  { name: "Aquarium", floor: 1, capacity: 4 },
  { name: "Mars", floor: 2, capacity: 6 },
  { name: "Gagarin", floor: 2, capacity: 8 },
  { name: "Horizon", floor: 3, capacity: 10 },
  { name: "Atlas", floor: 4, capacity: 12 },
  { name: "Orbit", floor: 4, capacity: 16 },
];

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
  });

  const [alex, maria] = await Promise.all([
    prisma.user.upsert({
      where: { email: "alex@room.test" },
      update: { name: "Alex Johnson", passwordHash },
      create: {
        name: "Alex Johnson",
        email: "alex@room.test",
        passwordHash,
      },
    }),
    prisma.user.upsert({
      where: { email: "maria@room.test" },
      update: { name: "Maria Novak", passwordHash },
      create: {
        name: "Maria Novak",
        email: "maria@room.test",
        passwordHash,
      },
    }),
  ]);

  const seededRooms = await Promise.all(
    rooms.map((room) =>
      prisma.room.upsert({
        where: { name: room.name },
        update: { floor: room.floor, capacity: room.capacity },
        create: room,
      }),
    ),
  );

  const nextMonday = DateTime.now()
    .setZone(OFFICE_TIME_ZONE)
    .startOf("week")
    .plus({ weeks: 1 });

  const demoBookings = [
    {
      roomId: seededRooms[0].id,
      userId: alex.id,
      title: "Demo: Product sync",
      startAt: nextMonday.plus({ days: 1, hours: 10 }).toUTC().toJSDate(),
      endAt: nextMonday.plus({ days: 1, hours: 11 }).toUTC().toJSDate(),
    },
    {
      roomId: seededRooms[1].id,
      userId: maria.id,
      title: "Demo: Design review",
      startAt: nextMonday.plus({ days: 2, hours: 13, minutes: 30 }).toUTC().toJSDate(),
      endAt: nextMonday.plus({ days: 2, hours: 15 }).toUTC().toJSDate(),
    },
    {
      roomId: seededRooms[0].id,
      userId: maria.id,
      title: "Demo: Hiring interview",
      startAt: nextMonday.plus({ days: 3, hours: 16 }).toUTC().toJSDate(),
      endAt: nextMonday.plus({ days: 3, hours: 17 }).toUTC().toJSDate(),
    },
  ];

  for (const booking of demoBookings) {
    const exists = await prisma.booking.findFirst({
      where: {
        roomId: booking.roomId,
        title: booking.title,
        startAt: booking.startAt,
      },
    });

    if (!exists) {
      await prisma.booking.create({ data: booking });
    }
  }

  console.info("Seed complete: 6 rooms, 2 demo users, and demo bookings.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
