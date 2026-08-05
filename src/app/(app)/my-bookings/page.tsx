import { MyBookingsClient } from "@/components/my-bookings-client";
import { requirePageUser } from "@/lib/session";

export default async function MyBookingsPage() {
  await requirePageUser();
  return <MyBookingsClient />;
}
