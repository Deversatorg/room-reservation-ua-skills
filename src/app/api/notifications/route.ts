import { apiError } from "@/lib/api";
import { listNotifications } from "@/lib/notification-service";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  return Response.json({ notifications: await listNotifications(user.id) });
}
