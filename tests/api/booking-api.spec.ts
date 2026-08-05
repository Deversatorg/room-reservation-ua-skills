import { expect, request as requestFactory, test } from "@playwright/test";

import { futureOfficeSlot, loginApi } from "../helpers/test-data";

test.describe.serial("booking API", () => {
  test("requires verification for a newly registered user", async ({ baseURL }) => {
    const api = await requestFactory.newContext({ baseURL });
    const email = `unverified-${Date.now()}@room.test`;
    const register = await api.post("/api/auth/register", {
      data: { name: "Unverified Contestant", email, password: "StrongPass123!" },
    });
    expect(register.status()).toBe(201);

    const rooms = await api.get("/api/rooms");
    const roomId = (await rooms.json()).rooms[0].id as string;
    const slot = futureOfficeSlot({ weeks: 7, weekday: 1, hour: 14 });
    const create = await api.post("/api/bookings", {
      data: { roomId, title: "Must be rejected", ...slot },
    });

    expect(create.status()).toBe(403);
    expect((await create.json()).error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
    await api.dispose();
  });

  test("filters rooms and enforces conflict, hours, and ownership rules", async ({
    baseURL,
  }) => {
    const alex = await requestFactory.newContext({ baseURL });
    const maria = await requestFactory.newContext({ baseURL });
    await loginApi(alex, "alex@room.test");
    await loginApi(maria, "maria@room.test");

    const filtered = await alex.get("/api/rooms?minCapacity=12");
    expect(filtered.status()).toBe(200);
    const rooms = (await filtered.json()).rooms as Array<{
      id: string;
      name: string;
      capacity: number;
    }>;
    expect(rooms.map((room) => room.name)).toEqual(["Atlas", "Orbit"]);
    expect(rooms.every((room) => room.capacity >= 12)).toBe(true);

    const slot = futureOfficeSlot({ weeks: 8, weekday: 2, hour: 11 });
    const create = await alex.post("/api/bookings", {
      data: { roomId: rooms[0].id, title: "API ownership check", ...slot },
    });
    expect(create.status()).toBe(201);
    const bookingId = (await create.json()).bookings[0].id as string;

    const conflict = await maria.post("/api/bookings", {
      data: { roomId: rooms[0].id, title: "Conflicting booking", ...slot },
    });
    expect(conflict.status()).toBe(409);
    expect((await conflict.json()).error.code).toBe("SLOT_OCCUPIED");

    const outsideHours = futureOfficeSlot({
      weeks: 8,
      weekday: 3,
      hour: 7,
    });
    const invalid = await alex.post("/api/bookings", {
      data: { roomId: rooms[1].id, title: "Too early", ...outsideHours },
    });
    expect(invalid.status()).toBe(422);
    expect((await invalid.json()).error.code).toBe("OUTSIDE_WORKING_HOURS");

    const forbidden = await maria.delete(`/api/bookings/${bookingId}`);
    expect(forbidden.status()).toBe(403);
    expect((await forbidden.json()).error.code).toBe("FORBIDDEN");

    const cancelled = await alex.delete(`/api/bookings/${bookingId}`);
    expect(cancelled.status()).toBe(200);
    expect((await cancelled.json()).cancelledCount).toBe(1);
    await alex.dispose();
    await maria.dispose();
  });

  test("creates and cancels a weekly series atomically", async ({ baseURL }) => {
    const alex = await requestFactory.newContext({ baseURL });
    await loginApi(alex);
    const rooms = (await (await alex.get("/api/rooms")).json()).rooms as Array<{
      id: string;
      name: string;
    }>;
    const roomId = rooms.find((room) => room.name === "Horizon")!.id;
    const slot = futureOfficeSlot({ weeks: 9, weekday: 4, hour: 15 });

    const create = await alex.post("/api/bookings", {
      data: {
        roomId,
        title: "API weekly series",
        ...slot,
        recurrence: { kind: "weekly", count: 3 },
      },
    });
    expect(create.status()).toBe(201);
    const body = await create.json();
    expect(body.seriesId).toEqual(expect.any(String));
    expect(body.bookings).toHaveLength(3);
    expect(body.bookings.map((booking: { series: { occurrence: number } }) => booking.series.occurrence)).toEqual([
      1, 2, 3,
    ]);

    const cancelOne = await alex.delete(
      `/api/bookings/${body.bookings[1].id}?scope=occurrence`,
    );
    expect(cancelOne.status()).toBe(200);
    expect((await cancelOne.json()).cancelledCount).toBe(1);

    const cancelFuture = await alex.delete(
      `/api/bookings/${body.bookings[0].id}?scope=series`,
    );
    expect(cancelFuture.status()).toBe(200);
    expect((await cancelFuture.json()).cancelledCount).toBe(2);
    await alex.dispose();
  });

  test("allows only one winner in a simultaneous booking race", async ({ baseURL }) => {
    const alex = await requestFactory.newContext({ baseURL });
    const maria = await requestFactory.newContext({ baseURL });
    await loginApi(alex, "alex@room.test");
    await loginApi(maria, "maria@room.test");
    const rooms = (await (await alex.get("/api/rooms")).json()).rooms as Array<{
      id: string;
      name: string;
    }>;
    const roomId = rooms.find((room) => room.name === "Orbit")!.id;
    const slot = futureOfficeSlot({ weeks: 10, weekday: 5, hour: 16 });

    const [first, second] = await Promise.all([
      alex.post("/api/bookings", {
        data: { roomId, title: "Race Alex", ...slot },
      }),
      maria.post("/api/bookings", {
        data: { roomId, title: "Race Maria", ...slot },
      }),
    ]);
    expect([first.status(), second.status()].sort()).toEqual([201, 409]);

    const winner = first.status() === 201 ? { response: first, api: alex } : { response: second, api: maria };
    const bookingId = (await winner.response.json()).bookings[0].id as string;
    await winner.api.delete(`/api/bookings/${bookingId}`);
    await alex.dispose();
    await maria.dispose();
  });
});
