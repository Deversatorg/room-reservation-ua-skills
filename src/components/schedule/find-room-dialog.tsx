"use client";

import { DateTime } from "luxon";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";
import {
  OFFICE_END_HOUR,
  OFFICE_START_HOUR,
  OFFICE_TIME_ZONE,
  SLOT_MINUTES,
} from "@/lib/booking-rules";
import {
  localSlotDateTimeLabel,
  localSlotTimeLabel,
} from "@/lib/calendar-time";
import type {
  AvailabilityOption,
  AvailabilitySearchResult,
} from "@/lib/types";

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

export function FindRoomDialog({
  initialDate,
  initialCapacity,
  userZone,
  returnFocus,
  onClose,
  onSelect,
}: {
  initialDate: string;
  initialCapacity: number;
  userZone: string;
  returnFocus: HTMLElement | null;
  onClose: () => void;
  onSelect: (option: AvailabilityOption, minCapacity: number) => void;
}) {
  const initialSearch = getInitialSearch(initialDate);
  const [date, setDate] = useState(initialSearch.date);
  const [startTime, setStartTime] = useState(initialSearch.startTime);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [minCapacity, setMinCapacity] = useState(
    initialCapacity > 0 ? initialCapacity : 4,
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [result, setResult] = useState<AvailabilitySearchResult>();
  const searchVersion = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  useAccessibleDialog(dialogRef, onClose, pending, returnFocus);

  const timeOptions = useMemo(() => {
    const lastStartMinutes = OFFICE_END_HOUR * 60 - durationMinutes;
    return Array.from(
      {
        length:
          Math.floor(
            (lastStartMinutes - OFFICE_START_HOUR * 60) / SLOT_MINUTES,
          ) + 1,
      },
      (_, index) => minutesToTime(OFFICE_START_HOUR * 60 + index * SLOT_MINUTES),
    );
  }, [durationMinutes]);

  function changeDuration(nextDuration: number) {
    invalidateResults();
    setDurationMinutes(nextDuration);
    const lastStart = OFFICE_END_HOUR * 60 - nextDuration;
    if (timeToMinutes(startTime) > lastStart) {
      setStartTime(minutesToTime(lastStart));
    }
  }

  function invalidateResults() {
    searchVersion.current += 1;
    setPending(false);
    setMessage(undefined);
    setResult(undefined);
  }

  async function searchAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const version = searchVersion.current + 1;
    searchVersion.current = version;
    setPending(true);
    setMessage(undefined);
    setResult(undefined);

    const params = new URLSearchParams({
      date,
      startTime,
      durationMinutes: String(durationMinutes),
      minCapacity: String(minCapacity),
    });

    try {
      const response = await fetch(`/api/availability?${params.toString()}`);
      const data = (await response.json()) as AvailabilitySearchResult & {
        error?: { message?: string };
      };
      if (version !== searchVersion.current) return;
      if (!response.ok) {
        setMessage(data.error?.message ?? "Could not search room availability.");
        return;
      }
      setResult(data);
    } catch {
      if (version === searchVersion.current) {
        setMessage("The server is unavailable. Please try again.");
      }
    } finally {
      if (version === searchVersion.current) setPending(false);
    }
  }

  const options = result
    ? result.exact.length > 0
      ? result.exact
      : result.alternatives
    : [];
  const resultHeading = result
    ? result.exact.length > 0
      ? `${result.exact.length} room${result.exact.length === 1 ? "" : "s"} available at your time`
      : result.alternatives.length > 0
        ? "Closest available options"
        : "No matching rooms found"
    : undefined;

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-room-dialog-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl sm:p-7"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Search className="size-5" />
          </span>
          <div>
            <h2
              id="find-room-dialog-title"
              className="text-xl font-semibold text-slate-950"
            >
              Find a room
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose when and how many people. Roomly will suggest the best fit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        <form
          className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
          onSubmit={searchAvailability}
        >
          <FinderField label="Office date" icon={<CalendarDays className="size-4" />}>
            <input
              data-dialog-initial-focus
              type="date"
              required
              min={DateTime.now().setZone(OFFICE_TIME_ZONE).toISODate()!}
              value={date}
              onChange={(event) => {
                invalidateResults();
                setDate(event.target.value);
              }}
              className={inputClass}
            />
          </FinderField>
          <FinderField label="Starts" icon={<Clock3 className="size-4" />}>
            <select
              value={startTime}
              onChange={(event) => {
                invalidateResults();
                setStartTime(event.target.value);
              }}
              className={inputClass}
            >
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time} Kyiv
                </option>
              ))}
            </select>
          </FinderField>
          <FinderField label="Duration" icon={<Clock3 className="size-4" />}>
            <select
              value={durationMinutes}
              onChange={(event) => changeDuration(Number(event.target.value))}
              className={inputClass}
            >
              {DURATION_OPTIONS.map((duration) => (
                <option key={duration} value={duration}>
                  {formatDuration(duration)}
                </option>
              ))}
            </select>
          </FinderField>
          <FinderField label="People" icon={<Users className="size-4" />}>
            <input
              type="number"
              required
              min={1}
              max={100}
              value={minCapacity}
              onChange={(event) => {
                invalidateResults();
                setMinCapacity(Number(event.target.value));
              }}
              className={inputClass}
            />
          </FinderField>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {pending ? "Searching…" : "Find available rooms"}
          </button>
        </form>

        <div className="mt-5" aria-live="polite" aria-atomic="true">
          {message ? (
            <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {message}
            </p>
          ) : null}
          {resultHeading ? (
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-indigo-500" />
                <h3 className="font-semibold text-slate-950">{resultHeading}</h3>
              </div>
              {result && result.exact.length === 0 && result.alternatives.length > 0 ? (
                <p className="mt-1 text-sm text-slate-500">
                  Your requested slot is busy, so these are the nearest matches.
                </p>
              ) : null}
              {options.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {options.map((option) => (
                    <AvailabilityCard
                      key={`${option.room.id}-${option.startAt}`}
                      option={option}
                      userZone={userZone}
                      onSelect={() => onSelect(option, result!.requested.minCapacity)}
                    />
                  ))}
                </div>
              ) : result ? (
                <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Try a smaller capacity or a different date. We searched the next 14 days.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AvailabilityCard({
  option,
  userZone,
  onSelect,
}: {
  option: AvailabilityOption;
  userZone: string;
  onSelect: () => void;
}) {
  const localStart = localSlotDateTimeLabel(
    option.officeDate,
    option.startTime,
    userZone,
  );
  const localEnd = localSlotTimeLabel(option.officeDate, option.endTime, userZone);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Book ${option.room.name} on ${localStart}`}
      className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <MapPin className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-950">{option.room.name}</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Floor {option.room.floor} · {option.room.capacity} people
          </span>
        </span>
        <ArrowRight className="mt-2 size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
      </span>
      <span className="mt-3 block text-sm font-semibold text-slate-800">
        {localStart}–{localEnd}
      </span>
      <span className="mt-1 block text-xs text-slate-500">
        Kyiv: {option.officeDate} · {option.startTime}–{option.endTime}
      </span>
    </button>
  );
}

function FinderField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span className="mb-2 flex items-center gap-2">
        <span className="text-indigo-500">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}

function getInitialSearch(initialDate: string) {
  const now = DateTime.now().setZone(OFFICE_TIME_ZONE);
  const today = now.toISODate()!;
  let date = initialDate >= today ? initialDate : today;
  let startMinutes = OFFICE_START_HOUR * 60;

  if (date === today) {
    const nextSlot = Math.ceil((now.hour * 60 + now.minute + 1) / SLOT_MINUTES) * SLOT_MINUTES;
    startMinutes = Math.max(startMinutes, nextSlot);
    const latestStartForDefaultDuration = OFFICE_END_HOUR * 60 - 60;
    if (startMinutes > latestStartForDefaultDuration) {
      date = now.plus({ days: 1 }).toISODate()!;
      startMinutes = OFFICE_START_HOUR * 60;
    }
  }

  return { date, startTime: minutesToTime(startMinutes) };
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0
    ? `${hours} hour${hours === 1 ? "" : "s"}`
    : `${hours}h ${remainder}m`;
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
