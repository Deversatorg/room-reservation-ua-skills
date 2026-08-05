CREATE TABLE "booking_series" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "room_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "kind" VARCHAR(16) NOT NULL DEFAULT 'WEEKLY',
    "occurrence_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_series_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "booking_series_weekly_only" CHECK ("kind" = 'WEEKLY'),
    CONSTRAINT "booking_series_occurrence_count" CHECK ("occurrence_count" BETWEEN 2 AND 12)
);

ALTER TABLE "bookings"
    ADD COLUMN "series_id" UUID,
    ADD COLUMN "occurrence_index" INTEGER,
    ADD CONSTRAINT "bookings_series_occurrence_pair" CHECK (
        ("series_id" IS NULL AND "occurrence_index" IS NULL)
        OR ("series_id" IS NOT NULL AND "occurrence_index" >= 0)
    );

CREATE INDEX "booking_series_user_id_idx" ON "booking_series"("user_id");
CREATE INDEX "booking_series_room_id_idx" ON "booking_series"("room_id");
CREATE UNIQUE INDEX "bookings_series_id_occurrence_index_key"
    ON "bookings"("series_id", "occurrence_index");

ALTER TABLE "booking_series"
    ADD CONSTRAINT "booking_series_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "booking_series"
    ADD CONSTRAINT "booking_series_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings"
    ADD CONSTRAINT "bookings_series_id_fkey"
    FOREIGN KEY ("series_id") REFERENCES "booking_series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
