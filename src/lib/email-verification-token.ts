import { createHash, randomBytes } from "node:crypto";

export const EMAIL_VERIFICATION_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const EMAIL_VERIFICATION_RESEND_MS = 60 * 1000;

export function hashEmailVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createEmailVerificationToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashEmailVerificationToken(token),
    expiresAt: new Date(now.getTime() + EMAIL_VERIFICATION_LIFETIME_MS),
  };
}

export function isEmailVerificationExpired(expiresAt: Date, now = new Date()) {
  return expiresAt <= now;
}

export function canResendEmailVerification(createdAt: Date, now = new Date()) {
  return now.getTime() - createdAt.getTime() >= EMAIL_VERIFICATION_RESEND_MS;
}
