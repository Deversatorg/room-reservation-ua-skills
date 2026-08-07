"use client";

import { DateTime } from "luxon";
import { CalendarClock, MapPin, Repeat2, UserRound, Users, X } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";
import type { BookingDto } from "@/lib/types";

export function BookingDetailsDialog({
  booking,
  userZone,
  onClose,
}: {
  booking: BookingDto;
  userZone: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(dialogRef, onClose);

  const localStart = DateTime.fromISO(booking.startAt).setZone(userZone);
  const localEnd = DateTime.fromISO(booking.endAt).setZone(userZone);
  const officeStart = DateTime.fromISO(booking.startAt).setZone(OFFICE_TIME_ZONE);
  const officeEnd = DateTime.fromISO(booking.endAt).setZone(OFFICE_TIME_ZONE);

  return (
    <div className="fixed inset-0 z-[60] grid items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-details-title"
        aria-describedby="booking-details-description"
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarClock className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600">
              Booking details
            </p>
            <h2
              id="booking-details-title"
              className="mt-1 text-xl font-semibold text-slate-950"
            >
              {booking.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking details"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="size-5" />
          </button>
        </div>

        <p id="booking-details-description" className="mt-4 text-sm leading-6 text-slate-600">
          {booking.isOwner
            ? "This booking has ended and is kept as read-only history."
            : "This booking belongs to another Roomly member and is available for viewing only."}
        </p>

        <dl className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-slate-50 px-4">
          <DetailRow icon={<UserRound className="size-4" />} label="Organizer">
            {booking.author.name}
          </DetailRow>
          <DetailRow icon={<MapPin className="size-4" />} label="Room">
            {booking.room.name} · Floor {booking.room.floor}
          </DetailRow>
          <DetailRow icon={<Users className="size-4" />} label="Capacity">
            {booking.room.capacity} people
          </DetailRow>
          <DetailRow icon={<CalendarClock className="size-4" />} label={`Time · ${userZone}`}>
            {formatRange(localStart, localEnd)}
          </DetailRow>
          {userZone !== OFFICE_TIME_ZONE ? (
            <DetailRow icon={<CalendarClock className="size-4" />} label="Office time · Europe/Kyiv">
              {formatRange(officeStart, officeEnd)}
            </DetailRow>
          ) : null}
          {booking.series ? (
            <DetailRow icon={<Repeat2 className="size-4" />} label="Recurring booking">
              Weekly · Occurrence {booking.series.occurrence} of {booking.series.count}
            </DetailRow>
          ) : null}
        </dl>

        <button
          type="button"
          onClick={onClose}
          data-dialog-initial-focus
          className="mt-6 h-11 w-full rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-slate-900">{children}</dd>
      </div>
    </div>
  );
}

function formatRange(start: DateTime, end: DateTime) {
  if (start.hasSame(end, "day")) {
    return `${start.toFormat("cccc, LLLL d · HH:mm")}–${end.toFormat("HH:mm")}`;
  }
  return `${start.toFormat("ccc, LLL d · HH:mm")}–${end.toFormat("ccc, LLL d · HH:mm")}`;
}
