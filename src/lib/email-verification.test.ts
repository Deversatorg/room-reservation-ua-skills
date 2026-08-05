import { describe, expect, it } from "vitest";

import {
  canResendEmailVerification,
  createEmailVerificationToken,
  EMAIL_VERIFICATION_LIFETIME_MS,
  hashEmailVerificationToken,
  isEmailVerificationExpired,
} from "@/lib/email-verification-token";

describe("email verification tokens", () => {
  const now = new Date("2026-08-05T12:00:00.000Z");

  it("creates a random token and stores only its SHA-256 hash", () => {
    const first = createEmailVerificationToken(now);
    const second = createEmailVerificationToken(now);

    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashEmailVerificationToken(first.token));
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.expiresAt.getTime() - now.getTime()).toBe(
      EMAIL_VERIFICATION_LIFETIME_MS,
    );
  });

  it("expires at the 24-hour boundary", () => {
    const { expiresAt } = createEmailVerificationToken(now);

    expect(isEmailVerificationExpired(expiresAt, new Date(expiresAt.getTime() - 1))).toBe(
      false,
    );
    expect(isEmailVerificationExpired(expiresAt, expiresAt)).toBe(true);
  });

  it("enforces a one-minute resend cooldown", () => {
    expect(canResendEmailVerification(now, new Date(now.getTime() + 59_999))).toBe(false);
    expect(canResendEmailVerification(now, new Date(now.getTime() + 60_000))).toBe(true);
  });
});
