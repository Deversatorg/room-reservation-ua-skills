# Roomly competition demo — 3 minutes

Use a desktop viewport first, then switch DevTools to 390 × 844. Keep a terminal open in the repository for the final proof.

## 0:00–0:25 — Sign in and orient the judges

1. Open the public URL or `http://localhost:3000`.
2. Sign in as `alex@room.test` / `DemoPass123!`.
3. Point out the detected browser timezone and explain that office rules remain in `Europe/Kyiv`.
4. Mention that sessions are database-backed, cookies are `httpOnly`, and only SHA-256 session-token hashes are stored.

## 0:25–0:55 — Calendar and capacity filter

1. Select **12+ people** in **Minimum capacity**.
2. Show that only Atlas and Orbit remain and the selected room updates automatically.
3. Point to `capacity=12` in the URL, refresh, and show that the filter survives.
4. Navigate one week forward and back; note the custom CSS Grid and 30-minute slots.

## 0:55–1:35 — Atomic recurring booking

1. Click **New booking**.
2. Enter `Competition weekly sync` and choose a future weekday from 13:00 to 14:00 Kyiv office time.
3. Enable **Repeat weekly**, choose 3 occurrences, and submit.
4. Explain that all occurrences are calculated from the Kyiv wall clock. If any date conflicts, the entire transaction rolls back and identifies the bad date.
5. Open **My bookings** and show all three numbered occurrences.

## 1:35–1:55 — Deep link and series cancellation

1. Open one occurrence in the schedule using its arrow action.
2. Return to **My bookings**, click its cancel action, and show both choices.
3. Choose **Cancel all future occurrences**; past history would remain untouched.

## 1:55–2:20 — Mobile day calendar and accessibility

1. Switch to 390 × 844.
2. Show the compact room selector, one-day calendar, previous/next-day controls, sticky time column, and the absence of horizontal page overflow.
3. Open **New booking** to show the bottom sheet.
4. Press `Shift+Tab`, `Tab`, and `Escape`; focus stays trapped while open and returns to **New booking** after closing.
5. Mention the Axe gate: zero serious/critical issues on auth, schedule, and My bookings.

## 2:20–2:40 — Email verification and notifications

1. Explain that demo users are pre-verified, while a new registration receives a 24-hour one-time token whose SHA-256 hash is stored.
2. The raw link is printed only to the server log in `EMAIL_VERIFICATION_MODE=log`; unverified users can browse but cannot create bookings.
3. Open the bell and explain the handoff rule: a reminder appears once when another active booking starts exactly as the current meeting ends. The client polls every 15 seconds and on focus.

## 2:40–3:00 — Automated proof

Run or show the latest CI result:

```bash
npm test
npm run test:browser
npm run test:race
```

Close with the guarantees:

- 20 unit tests and 10 API/E2E/Axe tests.
- PostgreSQL exclusion constraint gives exactly one race winner.
- Weekly series creation is all-or-nothing.
- Notification claiming is locked and uniquely deduplicated.
- Docker Compose and GitHub Actions use PostgreSQL 17 and the same migrations.

## Optional judge questions

**Why both an application conflict check and a database constraint?** The application check returns a friendly message; the database constraint is the final concurrency authority.

**Why store UTC if the office works in Kyiv time?** UTC represents each real instant correctly. Rules and recurrence convert through the named `Europe/Kyiv` zone so DST remains correct.

**Why polling instead of push?** The competition scope needs reliable in-app delivery without third-party infrastructure. Atomic server claiming gives exactly-once creation; polling controls only when the client observes it.
