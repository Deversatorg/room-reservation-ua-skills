import { expect, request as requestFactory, test } from "@playwright/test";

import { createNotificationFixture } from "../helpers/notification-fixture";
import { loginApi } from "../helpers/test-data";

test("polls a handoff notification exactly once and marks it read", async ({ baseURL }) => {
  const fixture = await createNotificationFixture();
  const api = await requestFactory.newContext({ baseURL });

  try {
    await loginApi(api);
    const [first, second] = await Promise.all([
      api.post("/api/notifications/poll"),
      api.post("/api/notifications/poll"),
    ]);
    expect(first.status()).toBe(200);
    expect(second.status()).toBe(200);
    const delivered = [
      ...(await first.json()).notifications,
      ...(await second.json()).notifications,
    ];
    expect(delivered).toHaveLength(1);
    expect(delivered[0].currentTitle).toBe(fixture.currentTitle);
    expect(delivered[0].nextTitle).toBe(fixture.nextTitle);

    const history = await api.get("/api/notifications");
    expect(history.status()).toBe(200);
    const stored = (await history.json()).notifications.find(
      (notification: { id: string }) => notification.id === delivered[0].id,
    );
    expect(stored).toBeTruthy();

    const read = await api.patch(`/api/notifications/${delivered[0].id}/read`);
    expect(read.status()).toBe(200);
    expect((await read.json()).read).toBe(true);
  } finally {
    await api.dispose();
    await fixture.cleanup();
  }
});
