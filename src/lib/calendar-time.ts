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
  locale = "en",
) {
  const local = officeSlotInUserZone(officeDate, officeTime, userZone).setLocale(locale);
  const localDate = local.toLocaleString({
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return `${localDate} · ${local.toFormat("HH:mm")}`;
}

export function getLocalOfficeDayPresentation(
  officeDate: string,
  userZone: string,
  locale = "en",
) {
  const start = officeSlotInUserZone(
    officeDate,
    `${String(OFFICE_START_HOUR).padStart(2, "0")}:00`,
    userZone,
  ).setLocale(locale);
  const lastSlotMinutes = OFFICE_END_HOUR * 60 - SLOT_MINUTES;
  const lastSlot = officeSlotInUserZone(
    officeDate,
    `${String(Math.floor(lastSlotMinutes / 60)).padStart(2, "0")}:${String(lastSlotMinutes % 60).padStart(2, "0")}`,
    userZone,
  ).setLocale(locale);
  const end = officeSlotInUserZone(
    officeDate,
    `${String(OFFICE_END_HOUR).padStart(2, "0")}:00`,
    userZone,
  ).setLocale(locale);
  const crossesDate = start.toISODate() !== lastSlot.toISODate();

  return {
    crossesDate,
    headerWeekday: crossesDate
      ? `${start.toFormat("ccc")} → ${lastSlot.toFormat("ccc")}`
      : start.toFormat("ccc"),
    headerDate: crossesDate
      ? `${shortDate(start)} → ${shortDate(lastSlot)}`
      : start.toFormat("d"),
    longDate: crossesDate
      ? `${longDate(start)} → ${longDate(lastSlot)}`
      : longDate(start),
    localWindow: `${start.toFormat("HH:mm")}–${end.toFormat("HH:mm")}`,
  };
}

function longDate(value: DateTime) {
  return value.toLocaleString({
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function shortDate(value: DateTime) {
  return value.toLocaleString({ month: "short", day: "numeric" });
}
