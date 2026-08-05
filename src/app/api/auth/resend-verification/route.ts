import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import {
  canResendEmailVerification,
  logEmailVerificationLink,
  replaceEmailVerificationToken,
} from "@/lib/email-verification";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");
  if (user.emailVerified) {
    return apiError(409, "EMAIL_ALREADY_VERIFIED", "Your email is already verified.");
  }

  const existing = await db.emailVerificationToken.findUnique({
    where: { userId: user.id },
    select: { createdAt: true },
  });
  if (existing && !canResendEmailVerification(existing.createdAt)) {
    return apiError(
      429,
      "RATE_LIMITED",
      "Wait one minute before requesting another verification link.",
    );
  }

  const token = await replaceEmailVerificationToken(user.id);
  logEmailVerificationLink(request.url, token);
  return Response.json({ sent: true });
}
