import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  const value = new URL(request.url).searchParams.get("minCapacity");
  const capacity = z.coerce.number().int().min(1).max(100).optional().safeParse(
    value ? value : undefined,
  );
  if (!capacity.success) {
    return apiError(422, "VALIDATION_ERROR", "Choose a valid room capacity.");
  }

  const rooms = await db.room.findMany({
    where: capacity.data ? { capacity: { gte: capacity.data } } : undefined,
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    select: { id: true, name: true, floor: true, capacity: true },
  });

  return Response.json({ rooms });
}
