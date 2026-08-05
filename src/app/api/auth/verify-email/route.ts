import { apiError, readJson, zodError } from "@/lib/api";
import { consumeEmailVerificationToken } from "@/lib/email-verification";
import { verifyEmailSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const input = await readJson(request);
  const result = verifyEmailSchema.safeParse(input);
  if (!result.success) return zodError(result.error);

  const verification = await consumeEmailVerificationToken(result.data.token);
  if (verification.status === "expired") {
    return apiError(
      410,
      "EXPIRED_VERIFICATION_TOKEN",
      "This verification link has expired. Request a new one.",
    );
  }
  if (verification.status === "invalid") {
    return apiError(
      400,
      "INVALID_VERIFICATION_TOKEN",
      "This verification link is invalid or has already been used.",
    );
  }

  return Response.json({ verified: true });
}
