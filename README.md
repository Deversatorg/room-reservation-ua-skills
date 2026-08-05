# Roomly — meeting room reservations

Roomly is a timezone-aware office meeting room reservation app built for UA-Skills event2. Employees can browse a hand-built weekly calendar, see who owns every booking, reserve an available interval, cancel their own bookings, and review upcoming or past reservations.

## Run everything with Docker

Requirements: Docker Desktop with Docker Compose.

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The app container waits for PostgreSQL, applies migrations, and runs the idempotent seed before starting Next.js.

Demo accounts:

| Name | Email | Password |
| --- | --- | --- |
| Alex Johnson | `alex@room.test` | `DemoPass123!` |
| Maria Novak | `maria@room.test` | `DemoPass123!` |

The seed creates six meeting rooms and several bookings in the next calendar week.

## Local development

Requirements: Node.js 24 LTS, npm, Docker, and a copy of `.env.example` named `.env`.

```bash
docker compose up db -d
npm ci
npm run db:deploy
npm run db:seed
npm run dev
```

Useful commands:

```bash
npm test              # required unit tests
npm run test:race     # integration check for concurrent booking protection
npm run lint
npm run build
npm run db:migrate    # create a migration during development
npm run db:seed
```

## How time and conflicts work

`Booking.startAt` and `Booking.endAt` are PostgreSQL `timestamptz` values and are sent over the API as UTC ISO strings. The server converts both instants to `Europe/Kyiv` before checking the 09:00–19:00 office window. The browser detects its IANA timezone and converts every visible event and slot independently, so no fixed UTC offset is assumed and daylight-saving transitions remain correct.

Intervals are treated as half-open ranges: `[start, end)`. Two intervals overlap only when `newStart < existingEnd && newEnd > existingStart`; consequently, `10:00–11:00` and `11:00–12:00` are valid neighbours. The API performs a friendly overlap check, while PostgreSQL is the final authority: a partial GiST exclusion constraint rejects overlapping active `tstzrange` values in the same room. This guarantees that two concurrent requests can create exactly one booking. Cancelling sets `cancelledAt`, so a cancelled interval no longer participates in that constraint.

## Architecture

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS.
- PostgreSQL 17 with Prisma ORM 7 and explicit SQL migrations.
- Database-backed sessions: the browser stores a random `httpOnly` token; PostgreSQL stores only its SHA-256 hash.
- Argon2id password hashing and server-side Zod validation.
- A custom CSS Grid weekly calendar — no calendar component library.
- Vitest unit coverage for touching, partially overlapping, identical, and adjacent-day intervals.

Main API routes:

- `POST /api/auth/register`, `/login`, `/logout`
- `GET /api/rooms`
- `GET|POST /api/bookings`
- `DELETE /api/bookings/:id`
- `GET /api/me/bookings?status=upcoming|past`

Errors use `{ "error": { "code", "message", "fieldErrors?" } }` and meaningful HTTP statuses (`401`, `403`, `404`, `409`, `422`).

## Implemented bonus points

1. Docker Compose starts PostgreSQL and the application with one command.
2. Database-level race protection guarantees a single winner for concurrent requests.

The full mobile-calendar bonus is intentionally out of scope, but the layout remains usable on narrow screens with a horizontally scrollable schedule.
