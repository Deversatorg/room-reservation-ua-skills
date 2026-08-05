ALTER TABLE "users"
    ADD COLUMN "email_verified_at" TIMESTAMPTZ(3);

CREATE TABLE "email_verification_tokens" (
    "token_hash" CHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("token_hash")
);

CREATE UNIQUE INDEX "email_verification_tokens_user_id_key"
    ON "email_verification_tokens"("user_id");
CREATE INDEX "email_verification_tokens_expires_at_idx"
    ON "email_verification_tokens"("expires_at");

ALTER TABLE "email_verification_tokens"
    ADD CONSTRAINT "email_verification_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
