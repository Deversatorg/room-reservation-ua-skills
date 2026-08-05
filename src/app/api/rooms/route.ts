import { apiError } from "@/lib/api";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  const rooms = await db.room.findMany({
    orderBy: [{ floor: "asc" }, { name: "asc" }],
    select: { id: true, name: true, floor: true, capacity: true },
  });

  return Response.json({ rooms });
}
