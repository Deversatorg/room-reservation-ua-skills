import { DateTime } from "luxon";

import {
  OFFICE_END_HOUR,
  OFFICE_START_HOUR,
  OFFICE_TIME_ZONE,
  SLOT_MINUTES,
} from "@/lib/booking-rules";

export function officeSlotInUserZone(
  officeDate: string,
  officeTime: string,
  userZone: string,
) {
  return DateTime.fromISO(`${officeDate}T${officeTime}`, {
    zone: OFFICE_TIME_ZONE,
  }).setZone(userZone);
}

export function localSlotTimeLabel(
  officeDate: string,
  officeTime: string,
  userZone: string,
) {
  return officeSlotInUserZone(officeDate, officeTime, userZone).toFormat("HH:mm");
}

export function localSlotDateTimeLabel(
  officeDate: string,
  officeTime: string,
  userZone: string,
) {
  return officeSlotInUserZone(officeDate, officeTime, userZone).toFormat(
    "cccc, LLLL d · HH:mm",
  );
}

export function getLocalOfficeDayPresentation(
  officeDate: string,
  userZone: string,
) {
  const start = officeSlotInUserZone(
    officeDate,
    `${String(OFFICE_START_HOUR).padStart(2, "0")}:00`,
    userZone,
  );
  const lastSlotMinutes = OFFICE_END_HOUR * 60 - SLOT_MINUTES;
  const lastSlot = officeSlotInUserZone(
    officeDate,
    `${String(Math.floor(lastSlotMinutes / 60)).padStart(2, "0")}:${String(lastSlotMinutes % 60).padStart(2, "0")}`,
    userZone,
  );
  const end = officeSlotInUserZone(
    officeDate,
    `${String(OFFICE_END_HOUR).padStart(2, "0")}:00`,
    userZone,
  );
  const crossesDate = start.toISODate() !== lastSlot.toISODate();

  return {
    crossesDate,
    headerWeekday: crossesDate
      ? `${start.toFormat("ccc")} → ${lastSlot.toFormat("ccc")}`
      : start.toFormat("ccc"),
    headerDate: crossesDate
      ? `${start.toFormat("LLL d")} → ${lastSlot.toFormat("LLL d")}`
      : start.toFormat("d"),
    longDate: crossesDate
      ? `${start.toFormat("cccc, LLLL d")} → ${lastSlot.toFormat("cccc, LLLL d")}`
      : start.toFormat("cccc, LLLL d"),
    localWindow: `${start.toFormat("HH:mm")}–${end.toFormat("HH:mm")}`,
  };
}
