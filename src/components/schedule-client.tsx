"use client";

import { DateTime } from "luxon";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import {
  OFFICE_END_HOUR,
  OFFICE_START_HOUR,
  OFFICE_TIME_ZONE,
  SLOT_MINUTES,
} from "@/lib/booking-rules";
import type { BookingDto, RoomDto } from "@/lib/types";

type SelectedSlot = { officeDate: string; startTime: string };

export function ScheduleClient({
  rooms,
  initialRoomId,
  initialWeek,
}: {
  rooms: RoomDto[];
  initialRoomId: string;
  initialWeek: string;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(initialRoomId);
  const [weekStart, setWeekStart] = useState(initialWeek);
  const userZone = useSyncExternalStore(
    subscribeToTimeZone,
    getBrowserTimeZone,
    getServerTimeZone,
  );
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>();
  const selectedRoom = rooms.find((room) => room.id === roomId) ?? rooms[0];

  useEffect(() => {
    if (!roomId) return;

    const controller = new AbortController();
    const officeStart = DateTime.fromISO(weekStart, { zone: OFFICE_TIME_ZONE });
    const from = officeStart.startOf("day").toUTC().toISO();
    const to = officeStart.plus({ days: 7 }).startOf("day").toUTC().toISO();

    async function loadBookings() {
      setLoading(true);
      setLoadError(undefined);

      try {
        const response = await fetch(
          `/api/bookings?roomId=${encodeURIComponent(roomId)}&from=${encodeURIComponent(from!)}&to=${encodeURIComponent(to!)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as {
          bookings?: BookingDto[];
          error?: { message?: string };
        };

        if (!response.ok) throw new Error(data.error?.message ?? "Could not load bookings.");
        setBookings(data.bookings ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : "Could not load bookings.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadBookings();
    return () => controller.abort();
  }, [roomId, weekStart, refreshKey]);

  function updateLocation(nextRoomId: string, nextWeek: string) {
    setRoomId(nextRoomId);
    setWeekStart(nextWeek);
    router.replace(`/schedule?room=${nextRoomId}&week=${nextWeek}`, { scroll: false });
  }

  function moveWeek(amount: number) {
    const nextWeek = DateTime.fromISO(weekStart, { zone: OFFICE_TIME_ZONE })
      .plus({ weeks: amount })
      .toISODate()!;
    updateLocation(roomId, nextWeek);
  }

  function goToday() {
    updateLocation(
      roomId,
      DateTime.now().setZone(OFFICE_TIME_ZONE).startOf("week").toISODate()!,
    );
  }

  async function cancelBooking(booking: BookingDto) {
    if (!booking.canCancel) return;
    if (!window.confirm(`Cancel “${booking.title}”?`)) return;

    const response = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      window.alert(data.error?.message ?? "Could not cancel the booking.");
      return;
    }

    setRefreshKey((value) => value + 1);
  }

  function handleCreated(nextRoomId: string, officeDate: string) {
    const nextWeek = DateTime.fromISO(officeDate, { zone: OFFICE_TIME_ZONE })
      .startOf("week")
      .toISODate()!;
    setSelectedSlot(undefined);
    updateLocation(nextRoomId, nextWeek);
    setRefreshKey((value) => value + 1);
  }

  if (!selectedRoom) {
    return (
      <EmptyRooms />
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Workspace calendar</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Meeting room schedule
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <Globe2 className="size-4 text-indigo-500" />
            {userZone ?? "Detecting timezone…"}
          </span>
          <button
            type="button"
            onClick={() =>
              setSelectedSlot({
                officeDate: DateTime.now().setZone(OFFICE_TIME_ZONE).toISODate()!,
                startTime: "09:00",
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
          >
            <Plus className="size-4" /> New booking
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:self-start">
          <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            Meeting rooms
          </p>
          <div className="space-y-1">
            {rooms.map((room) => {
              const active = room.id === roomId;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => updateLocation(room.id, weekStart)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition ${
                    active
                      ? "bg-indigo-50 text-indigo-950 ring-1 ring-indigo-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span className="block font-semibold">{room.name}</span>
                  <span className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" /> Floor {room.floor}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" /> {room.capacity}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-950">{selectedRoom.name}</p>
              <p className="text-xs text-slate-400">Office timezone: {OFFICE_TIME_ZONE}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveWeek(-1)}
                className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label="Previous week"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => moveWeek(1)}
                className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label="Next week"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          {loadError && (
            <div className="m-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="ml-auto inline-flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="size-4" /> Retry
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <CalendarGrid
              weekStart={weekStart}
              userZone={userZone ?? "UTC"}
              bookings={bookings}
              loading={loading}
              onSelect={setSelectedSlot}
              onCancel={cancelBooking}
            />
          </div>
        </section>
      </div>

      {selectedSlot && userZone && (
        <BookingDialog
          key={`${selectedSlot.officeDate}-${selectedSlot.startTime}`}
          rooms={rooms}
          initialRoomId={roomId}
          slot={selectedSlot}
          userZone={userZone}
          onClose={() => setSelectedSlot(undefined)}
          onCreated={handleCreated}
        />
      )}
    </main>
  );
}

function CalendarGrid({
  weekStart,
  userZone,
  bookings,
  loading,
  onSelect,
  onCancel,
}: {
  weekStart: string;
  userZone: string;
  bookings: BookingDto[];
  loading: boolean;
  onSelect: (slot: SelectedSlot) => void;
  onCancel: (booking: BookingDto) => void;
}) {
  const officeWeek = DateTime.fromISO(weekStart, { zone: OFFICE_TIME_ZONE });
  const days = Array.from({ length: 7 }, (_, index) => officeWeek.plus({ days: index }));
  const slots = Array.from({ length: 20 }, (_, index) => {
    const minutes = OFFICE_START_HOUR * 60 + index * SLOT_MINUTES;
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  });
  const nowOffice = DateTime.now().setZone(OFFICE_TIME_ZONE);
  const currentSlot =
    nowOffice.hour >= OFFICE_START_HOUR && nowOffice.hour < OFFICE_END_HOUR
      ? Math.floor(
          (nowOffice.hour * 60 + nowOffice.minute - OFFICE_START_HOUR * 60) /
            SLOT_MINUTES,
        )
      : -1;

  return (
    <div
      className="relative grid min-w-[1050px] bg-slate-200 [grid-template-columns:72px_repeat(7,minmax(138px,1fr))] [grid-template-rows:68px_repeat(20,44px)] gap-px"
      aria-busy={loading}
    >
      <div className="sticky left-0 z-30 bg-white" />
      {days.map((day, dayIndex) => {
        const localDate = day.set({ hour: OFFICE_START_HOUR }).setZone(userZone);
        const isToday = day.toISODate() === nowOffice.toISODate();
        return (
          <div
            key={day.toISODate()}
            style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
            className={`flex flex-col items-center justify-center bg-white ${isToday ? "text-indigo-700" : "text-slate-600"}`}
          >
            <span className="text-xs font-bold uppercase tracking-[0.12em]">
              {localDate.toFormat("ccc")}
            </span>
            <span
              className={`mt-1 grid size-8 place-items-center rounded-full text-sm font-semibold ${isToday ? "bg-indigo-600 text-white" : ""}`}
            >
              {localDate.day}
            </span>
          </div>
        );
      })}

      {slots.map((time, slotIndex) => {
        const localTime = localSlotLabel(days[0].toISODate()!, time, userZone);
        return (
          <div key={time} className="contents">
            <div
              style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
              className="sticky left-0 z-20 flex items-start justify-end bg-white pr-3 pt-1 text-[11px] font-medium text-slate-400"
            >
              {localTime}
            </div>
            {days.map((day, dayIndex) => {
              const officeDate = day.toISODate()!;
              const slotStart = DateTime.fromISO(`${officeDate}T${time}`, {
                zone: OFFICE_TIME_ZONE,
              });
              const slotEnd = slotStart.plus({ minutes: SLOT_MINUTES });
              const occupied = bookings.some(
                (booking) =>
                  DateTime.fromISO(booking.startAt) < slotEnd &&
                  DateTime.fromISO(booking.endAt) > slotStart,
              );
              const isCurrent =
                officeDate === nowOffice.toISODate() && slotIndex === currentSlot;
              return (
                <button
                  key={`${officeDate}-${time}`}
                  type="button"
                  disabled={occupied || loading}
                  onClick={() => onSelect({ officeDate, startTime: time })}
                  style={{ gridColumn: dayIndex + 2, gridRow: slotIndex + 2 }}
                  className={`relative bg-white transition hover:bg-indigo-50 disabled:cursor-default ${
                    isCurrent ? "after:absolute after:left-0 after:right-0 after:top-0 after:h-0.5 after:bg-rose-500" : ""
                  }`}
                  aria-label={`Book ${localSlotLabel(officeDate, time, userZone)} on ${day.toFormat("cccc, LLLL d")}`}
                />
              );
            })}
          </div>
        );
      })}

      {bookings.map((booking) => {
        const startOffice = DateTime.fromISO(booking.startAt).setZone(OFFICE_TIME_ZONE);
        const endOffice = DateTime.fromISO(booking.endAt).setZone(OFFICE_TIME_ZONE);
        const dayIndex = Math.floor(startOffice.startOf("day").diff(officeWeek.startOf("day"), "days").days);
        const startSlot =
          (startOffice.hour * 60 + startOffice.minute - OFFICE_START_HOUR * 60) /
          SLOT_MINUTES;
        const durationSlots = Math.max(1, endOffice.diff(startOffice, "minutes").minutes / SLOT_MINUTES);

        if (dayIndex < 0 || dayIndex > 6 || startSlot < 0 || startSlot >= 20) return null;

        return (
          <button
            key={booking.id}
            type="button"
            onClick={() => void onCancel(booking)}
            title={booking.canCancel ? "Click to cancel this booking" : `${booking.title} · ${booking.author.name}`}
            style={{
              gridColumn: dayIndex + 2,
              gridRow: `${startSlot + 2} / span ${durationSlots}`,
            }}
            className={`z-10 m-1 overflow-hidden rounded-lg border-l-4 px-2 py-1.5 text-left shadow-sm transition ${
              booking.canCancel
                ? "border-indigo-600 bg-indigo-100 text-indigo-950 hover:bg-indigo-200"
                : "border-slate-500 bg-slate-100 text-slate-800"
            }`}
          >
            <span className="block truncate text-xs font-bold">{booking.title}</span>
            <span className="mt-0.5 block truncate text-[10px] opacity-70">
              {DateTime.fromISO(booking.startAt).setZone(userZone).toFormat("HH:mm")} ·{" "}
              {booking.author.name}
            </span>
          </button>
        );
      })}

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-white/55 backdrop-blur-[1px]">
          <span className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-lg">
            <LoaderCircle className="size-4 animate-spin text-indigo-600" /> Loading schedule…
          </span>
        </div>
      )}
    </div>
  );
}

function BookingDialog({
  rooms,
  initialRoomId,
  slot,
  userZone,
  onClose,
  onCreated,
}: {
  rooms: RoomDto[];
  initialRoomId: string;
  slot: SelectedSlot;
  userZone: string;
  onClose: () => void;
  onCreated: (roomId: string, officeDate: string) => void;
}) {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [date, setDate] = useState(slot.officeDate);
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(addMinutes(slot.startTime, SLOT_MINUTES));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const timeOptions = useMemo(
    () =>
      Array.from({ length: 21 }, (_, index) => {
        const minutes = OFFICE_START_HOUR * 60 + index * SLOT_MINUTES;
        return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      }),
    [],
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
    const endAt = DateTime.fromISO(`${date}T${endTime}`, { zone: OFFICE_TIME_ZONE })
      .toUTC()
      .toISO();

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, title: form.get("title"), startAt, endAt }),
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dialog-title"
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <CalendarPlus className="size-5" />
          </span>
          <div>
            <h2 id="booking-dialog-title" className="text-xl font-semibold text-slate-950">
              New booking
            </h2>
            <p className="mt-1 text-sm text-slate-500">Times are shown in {userZone}.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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
              maxLength={100}
              placeholder="e.g. Weekly product sync"
              className={inputClass}
            />
          </DialogField>

          <DialogField label="Meeting room" error={fieldErrors.roomId?.[0]}>
            <select value={roomId} onChange={(event) => setRoomId(event.target.value)} className={inputClass}>
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

          <div className="grid grid-cols-2 gap-3">
            <DialogField label="Starts" error={fieldErrors.startAt?.[0]}>
              <select value={startTime} onChange={(event) => changeStart(event.target.value)} className={inputClass}>
                {timeOptions.slice(0, -1).map((time) => (
                  <option key={time} value={time}>
                    {localSlotLabel(date, time, userZone)}
                  </option>
                ))}
              </select>
            </DialogField>
            <DialogField label="Ends" error={fieldErrors.endAt?.[0]}>
              <select value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClass}>
                {timeOptions.slice(1).map((time) => (
                  <option key={time} value={time}>
                    {localSlotLabel(date, time, userZone)}
                  </option>
                ))}
              </select>
            </DialogField>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-500">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-indigo-500" />
            Office hours are 09:00–19:00 Europe/Kyiv. Maximum duration is 4 hours.
          </div>

          {message && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
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
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      <span className="mb-2 block">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-xs font-normal text-rose-600">{error}</span>}
    </label>
  );
}

function EmptyRooms() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <CalendarPlus className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-slate-950">No rooms available</h1>
      <p className="mt-2 text-slate-500">Run the database seed to create the office rooms.</p>
    </main>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

function localSlotLabel(officeDate: string, officeTime: string, userZone: string) {
  return DateTime.fromISO(`${officeDate}T${officeTime}`, { zone: OFFICE_TIME_ZONE })
    .setZone(userZone)
    .toFormat("HH:mm");
}

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function addMinutes(time: string, amount: number) {
  const minutes = timeToMinutes(time) + amount;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function subscribeToTimeZone() {
  return () => undefined;
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getServerTimeZone() {
  return undefined;
}
