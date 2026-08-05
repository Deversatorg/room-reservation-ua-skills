import { z } from "zod";

import { apiError } from "@/lib/api";
import { markNotificationRead } from "@/lib/notification-service";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return apiError(404, "NOT_FOUND", "Notification not found.");
  }

  const updated = await markNotificationRead(id, user.id);
  if (!updated) return apiError(404, "NOT_FOUND", "Notification not found.");
  return Response.json({ read: true });
}
