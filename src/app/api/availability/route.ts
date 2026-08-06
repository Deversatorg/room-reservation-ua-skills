import { apiError, zodError } from "@/lib/api";
import { findAvailableRooms } from "@/lib/availability-service";
import {
  OFFICE_TIME_ZONE,
  officeDateTimeToUtc,
  validateBookingWindow,
} from "@/lib/booking-rules";
import { getCurrentUser } from "@/lib/session";
import { availabilitySearchSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, "AUTH_REQUIRED", "Sign in to continue.");

  const searchParams = new URL(request.url).searchParams;
  const result = availabilitySearchSchema.safeParse({
    date: searchParams.get("date"),
    startTime: searchParams.get("startTime"),
    durationMinutes: searchParams.get("durationMinutes"),
    minCapacity: searchParams.get("minCapacity"),
  });
  if (!result.success) return zodError(result.error);

  const desiredStartDateTime = officeDateTimeToUtc(
    result.data.date,
    result.data.startTime,
  );
  const desiredStart = desiredStartDateTime.toJSDate();
  const desiredEnd = new Date(
    desiredStart.getTime() + result.data.durationMinutes * 60_000,
  );
  const violation = validateBookingWindow(desiredStart, desiredEnd);
  if (violation) {
    return apiError(422, violation.code, violation.message, {
      [violation.field]: [violation.message],
    });
  }

  try {
    const availability = await findAvailableRooms({
      desiredStart,
      durationMinutes: result.data.durationMinutes,
      minCapacity: result.data.minCapacity,
    });

    return Response.json({
      requested: {
        officeDate: result.data.date,
        startTime: result.data.startTime,
        endTime: desiredStartDateTime
          .plus({ minutes: result.data.durationMinutes })
          .setZone(OFFICE_TIME_ZONE)
          .toFormat("HH:mm"),
        durationMinutes: result.data.durationMinutes,
        minCapacity: result.data.minCapacity,
      },
      ...availability,
    });
  } catch (error) {
    console.error("Availability search failed", error);
    return apiError(500, "SERVER_ERROR", "Could not search room availability.");
  }
}
