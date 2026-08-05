import "server-only";

import { db } from "@/lib/db";
import {
  createEmailVerificationToken,
  hashEmailVerificationToken,
  isEmailVerificationExpired,
} from "@/lib/email-verification-token";

export {
  canResendEmailVerification,
  createEmailVerificationToken,
  hashEmailVerificationToken,
  isEmailVerificationExpired,
} from "@/lib/email-verification-token";

export function logEmailVerificationLink(requestUrl: string, token: string) {
  const defaultMode = process.env.NODE_ENV === "production" ? "disabled" : "log";
  if ((process.env.EMAIL_VERIFICATION_MODE ?? defaultMode) !== "log") return;

  const verificationUrl = new URL("/verify-email", requestUrl);
  verificationUrl.searchParams.set("token", token);
  console.info(`[email-verification] ${verificationUrl.toString()}`);
}

export async function replaceEmailVerificationToken(userId: string, now = new Date()) {
  const token = createEmailVerificationToken(now);

  await db.emailVerificationToken.upsert({
    where: { userId },
    update: {
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: now,
    },
    create: {
      userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      createdAt: now,
    },
  });

  return token.token;
}

export async function consumeEmailVerificationToken(rawToken: string, now = new Date()) {
  const tokenHash = hashEmailVerificationToken(rawToken);
  const token = await db.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true },
  });

  if (!token) return { status: "invalid" as const };
  if (isEmailVerificationExpired(token.expiresAt, now)) {
    await db.emailVerificationToken.deleteMany({ where: { tokenHash } });
    return { status: "expired" as const };
  }

  const consumed = await db.$transaction(async (transaction) => {
    const deleted = await transaction.emailVerificationToken.deleteMany({
      where: { tokenHash, expiresAt: { gt: now } },
    });
    if (deleted.count !== 1) return false;

    await transaction.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: now },
    });
    return true;
  });

  return consumed ? { status: "verified" as const } : { status: "invalid" as const };
}
