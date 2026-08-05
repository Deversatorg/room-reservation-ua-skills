import argon2 from "argon2";

import { Prisma } from "@/generated/prisma/client";
import { apiError, readJson, zodError } from "@/lib/api";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const input = await readJson(request);
  const result = registerSchema.safeParse(input);
  if (!result.success) return zodError(result.error);

  const { name, email, password } = result.data;

  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const user = await db.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });

    await createSession(user.id);
    return Response.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiError(409, "EMAIL_TAKEN", "This email is already registered.", {
        email: ["This email is already registered."],
      });
    }

    console.error("Registration failed", error);
    return apiError(500, "SERVER_ERROR", "Could not create your account.");
  }
}
