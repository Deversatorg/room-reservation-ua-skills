import argon2 from "argon2";

import { apiError, readJson, zodError } from "@/lib/api";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const input = await readJson(request);
  const result = loginSchema.safeParse(input);
  if (!result.success) return zodError(result.error);

  const user = await db.user.findUnique({ where: { email: result.data.email } });

  if (!user || !(await argon2.verify(user.passwordHash, result.data.password))) {
    return apiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  await createSession(user.id);
  return Response.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
}
