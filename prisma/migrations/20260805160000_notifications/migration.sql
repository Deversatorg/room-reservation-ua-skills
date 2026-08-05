CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "current_booking_id" UUID NOT NULL,
    "next_booking_id" UUID NOT NULL,
    "delivered_at" TIMESTAMPTZ(3) NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_current_booking_id_key"
    ON "notifications"("current_booking_id");
CREATE INDEX "notifications_user_id_delivered_at_idx"
    ON "notifications"("user_id", "delivered_at");
CREATE INDEX "notifications_next_booking_id_idx"
    ON "notifications"("next_booking_id");

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_current_booking_id_fkey"
    FOREIGN KEY ("current_booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_next_booking_id_fkey"
    FOREIGN KEY ("next_booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
