"use client";

import { DateTime } from "luxon";
import {
  CalendarPlus,
  Clock3,
  LoaderCircle,
  Plus,
  Repeat2,
  X,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";

import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";
import {
  bookingEndTimeOptions,
  OFFICE_START_HOUR,
  OFFICE_TIME_ZONE,
  SLOT_MINUTES,
} from "@/lib/booking-rules";
import {
  getLocalOfficeDayPresentation,
  localSlotDateTimeLabel,
  localSlotTimeLabel,
} from "@/lib/calendar-time";
import type { RoomDto } from "@/lib/types";

export type SelectedSlot = {
  officeDate: string;
  startTime: string;
  endTime?: string;
  roomId?: string;
  minCapacity?: number;
};

export function BookingDialog({
  rooms,
  initialRoomId,
  slot,
  userZone,
  returnFocus,
  onClose,
  onCreated,
}: {
  rooms: RoomDto[];
  initialRoomId: string;
  slot: SelectedSlot;
  userZone: string;
  returnFocus: HTMLElement | null;
  onClose: () => void;
  onCreated: (roomId: string, officeDate: string) => void;
}) {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [date, setDate] = useState(slot.officeDate);
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(
    slot.endTime ?? addMinutes(slot.startTime, SLOT_MINUTES),
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [occurrenceCount, setOccurrenceCount] = useState(8);
  const localDay = getLocalOfficeDayPresentation(date, userZone);
  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(dialogRef, onClose, pending, returnFocus);
  const timeOptions = useMemo(
    () =>
      Array.from({ length: 21 }, (_, index) => {
        const minutes = OFFICE_START_HOUR * 60 + index * SLOT_MINUTES;
        return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      }),
    [],
  );
  const endTimeOptions = useMemo(
    () => bookingEndTimeOptions(startTime),
    [startTime],
  );

  function changeStart(nextStart: string) {
    setStartTime(nextStart);
    const startMinutes = timeToMinutes(nextStart);
    const endMinutes = timeToMinutes(endTime);
    if (endMinutes <= startMinutes || endMinutes - startMinutes > 240) {
      setEndTime(addMinutes(nextStart, SLOT_MINUTES));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const startAt = DateTime.fromISO(`${date}T${startTime}`, {
      zone: OFFICE_TIME_ZONE,
    })
      .toUTC()
      .toISO();
    const endAt = DateTime.fromISO(`${date}T${endTime}`, {
      zone: OFFICE_TIME_ZONE,
    })
      .toUTC()
      .toISO();

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          title: form.get("title"),
          startAt,
          endAt,
          recurrence: repeatWeekly
            ? { kind: "weekly", count: occurrenceCount }
            : undefined,
        }),
      });
      const data = (await response.json()) as {
        error?: { message?: string; fieldErrors?: Record<string, string[]> };
      };

      if (!response.ok) {
        setMessage(data.error?.message ?? "Could not create the booking.");
        setFieldErrors(data.error?.fieldErrors ?? {});
        return;
      }

      onCreated(roomId, date);
    } catch {
      setMessage("The server is unavailable. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dialog-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarPlus className="size-5" />
          </span>
          <div>
            <h2
              id="booking-dialog-title"
              className="text-xl font-semibold text-slate-950"
            >
              New booking
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Meeting times are shown in {userZone}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <DialogField label="Title" error={fieldErrors.title?.[0]}>
            <input
              name="title"
              autoFocus
              data-dialog-initial-focus
              maxLength={100}
              placeholder="e.g. Weekly product sync"
              className={inputClass}
            />
          </DialogField>

          <DialogField label="Meeting room" error={fieldErrors.roomId?.[0]}>
            <select
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className={inputClass}
            >
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} · floor {room.floor} · {room.capacity} people
                </option>
              ))}
            </select>
          </DialogField>

          <DialogField label="Office calendar date" error={fieldErrors.startAt?.[0]}>
            <input
              type="date"
              value={date}
              min={DateTime.now().setZone(OFFICE_TIME_ZONE).toISODate()!}
              onChange={(event) => setDate(event.target.value)}
              className={inputClass}
            />
          </DialogField>

          <p className="-mt-2 text-xs text-slate-500">
            Local availability: {localDay.longDate} · {localDay.localWindow}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <DialogField label="Starts" error={fieldErrors.startAt?.[0]}>
              <select
                value={startTime}
                onChange={(event) => changeStart(event.target.value)}
                className={inputClass}
              >
                {timeOptions.slice(0, -1).map((time) => (
                  <option key={time} value={time}>
                    {localDay.crossesDate
                      ? localSlotDateTimeLabel(date, time, userZone)
                      : localSlotTimeLabel(date, time, userZone)}
                  </option>
                ))}
              </select>
            </DialogField>
            <DialogField label="Ends" error={fieldErrors.endAt?.[0]}>
              <select
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className={inputClass}
              >
                {endTimeOptions.map((time) => (
                  <option key={time} value={time}>
                    {localDay.crossesDate
                      ? localSlotDateTimeLabel(date, time, userZone)
                      : localSlotTimeLabel(date, time, userZone)}
                  </option>
                ))}
              </select>
            </DialogField>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={repeatWeekly}
                onChange={(event) => setRepeatWeekly(event.target.checked)}
                className="size-4 rounded border-slate-300 text-indigo-600"
              />
              <Repeat2 className="size-4 text-indigo-500" /> Repeat weekly
            </label>
            {repeatWeekly && (
              <label className="mt-3 flex items-center justify-between gap-4 text-sm text-slate-600">
                Number of occurrences
                <select
                  value={occurrenceCount}
                  onChange={(event) => setOccurrenceCount(Number(event.target.value))}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-800"
                >
                  {Array.from({ length: 11 }, (_, index) => index + 2).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-indigo-500" />
            Office hours are 09:00–19:00 Europe/Kyiv. Maximum duration is 4 hours.
          </div>

          {message && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            >
              {message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60"
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              Book room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DialogField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span className="mb-2 block">{label}</span>
      {children}
      {error && (
        <span className="mt-1.5 block text-xs font-normal text-rose-600">{error}</span>
      )}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function addMinutes(time: string, amount: number) {
  const minutes = timeToMinutes(time) + amount;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
