import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return new Response(null, { status: 204 });
}
