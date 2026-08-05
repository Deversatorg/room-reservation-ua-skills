"use client";

import { DateTime } from "luxon";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Globe2,
  LoaderCircle,
  MapPin,
  Plus,
  SlidersHorizontal,
  RefreshCw,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from "react";

import {
  OFFICE_END_HOUR,
  OFFICE_START_HOUR,
  OFFICE_TIME_ZONE,
  SLOT_MINUTES,
} from "@/lib/booking-rules";
import { CancelBookingDialog } from "@/components/cancel-booking-dialog";
import {
  BookingDialog,
  type SelectedSlot,
} from "@/components/schedule/booking-dialog";
import { useUserTimeZone } from "@/hooks/use-user-time-zone";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { BookingDto, RoomDto } from "@/lib/types";

export function ScheduleClient({
  rooms,
  initialRoomId,
  initialWeek,
  initialDay,
  initialMinCapacity,
}: {
  rooms: RoomDto[];
  initialRoomId: string;
  initialWeek: string;
  initialDay: string;
  initialMinCapacity: number;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(initialRoomId);
  const [weekStart, setWeekStart] = useState(initialWeek);
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [minCapacity, setMinCapacity] = useState(initialMinCapacity);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const userZone = useUserTimeZone();
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot>();
  const [bookingTrigger, setBookingTrigger] = useState<HTMLElement | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<BookingDto>();
  const [cancelPending, setCancelPending] = useState(false);
  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.capacity >= minCapacity),
    [minCapacity, rooms],
  );
  const selectedRoom =
    filteredRooms.find((room) => room.id === roomId) ?? filteredRooms[0];
  const touchStart = useRef<{ x: number; y: number } | undefined>(undefined);

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

  function updateLocation(
    nextRoomId: string,
    nextWeek: string,
    nextDay = selectedDay,
    nextCapacity = minCapacity,
  ) {
    setRoomId(nextRoomId);
    setWeekStart(nextWeek);
    setSelectedDay(nextDay);
    setMinCapacity(nextCapacity);
    const params = new URLSearchParams({
      room: nextRoomId,
      week: nextWeek,
      day: nextDay,
    });
    if (nextCapacity > 0) params.set("capacity", String(nextCapacity));
    router.replace(`/schedule?${params.toString()}`, { scroll: false });
  }

  function changeCapacity(nextCapacity: number) {
    const nextRoom = rooms.find((room) => room.capacity >= nextCapacity);
    updateLocation(
      rooms.some((room) => room.id === roomId && room.capacity >= nextCapacity)
        ? roomId
        : (nextRoom?.id ?? ""),
      weekStart,
      selectedDay,
      nextCapacity,
    );
  }

  function moveWeek(amount: number) {
    const nextWeek = DateTime.fromISO(weekStart, { zone: OFFICE_TIME_ZONE })
      .plus({ weeks: amount })
      .toISODate()!;
    updateLocation(roomId, nextWeek, nextWeek);
  }

  function moveDay(amount: number) {
    const nextDay = DateTime.fromISO(selectedDay, { zone: OFFICE_TIME_ZONE })
      .plus({ days: amount })
      .toISODate()!;
    const nextWeek = DateTime.fromISO(nextDay, { zone: OFFICE_TIME_ZONE })
      .startOf("week")
      .toISODate()!;
    updateLocation(roomId, nextWeek, nextDay);
  }

  function goToday() {
    const today = DateTime.now().setZone(OFFICE_TIME_ZONE);
    updateLocation(roomId, today.startOf("week").toISODate()!, today.toISODate()!);
  }

  function startSwipe(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function endSwipe(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = undefined;
    if (!start || !isMobile) return;
    const touch = event.changedTouches[0];
    const horizontal = touch.clientX - start.x;
    const vertical = touch.clientY - start.y;
    if (Math.abs(horizontal) > 60 && Math.abs(horizontal) > Math.abs(vertical)) {
      moveDay(horizontal < 0 ? 1 : -1);
    }
  }

  async function cancelBooking(scope: "occurrence" | "series") {
    if (!bookingToCancel) return;
    setCancelPending(true);
    try {
      const response = await fetch(
        `/api/bookings/${bookingToCancel.id}?scope=${scope}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: { message?: string } };
        window.alert(data.error?.message ?? "Could not cancel the booking.");
        return;
      }

      setBookingToCancel(undefined);
      setRefreshKey((value) => value + 1);
    } catch {
      window.alert("The server is unavailable. Please try again.");
    } finally {
      setCancelPending(false);
    }
  }

  function handleCreated(nextRoomId: string, officeDate: string) {
    const nextWeek = DateTime.fromISO(officeDate, { zone: OFFICE_TIME_ZONE })
      .startOf("week")
      .toISODate()!;
    setSelectedSlot(undefined);
    updateLocation(nextRoomId, nextWeek, officeDate);
    setRefreshKey((value) => value + 1);
  }

  function openBooking(slot: SelectedSlot) {
    setBookingTrigger(
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    );
    setSelectedSlot(slot);
  }

  if (!selectedRoom) {
    return (
      <EmptyRooms filtered={minCapacity > 0} onReset={() => changeCapacity(0)} />
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
          <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 shadow-sm">
            <SlidersHorizontal className="size-4 text-indigo-500" />
            <span className="sr-only sm:not-sr-only">Minimum capacity</span>
            <select
              aria-label="Minimum room capacity"
              value={minCapacity}
              onChange={(event) => changeCapacity(Number(event.target.value))}
              className="bg-transparent font-semibold text-slate-700 outline-none"
            >
              <option value={0}>Any size</option>
              {[4, 6, 8, 10, 12, 16].map((capacity) => (
                <option key={capacity} value={capacity}>{capacity}+ people</option>
              ))}
            </select>
          </label>
          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <Globe2 className="size-4 text-indigo-500" />
            {userZone ?? "Detecting timezone…"}
          </span>
          <button
            type="button"
            onClick={() =>
              openBooking({
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

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:hidden">
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
          Meeting room
          <select
            value={roomId}
            onChange={(event) => updateLocation(event.target.value, weekStart)}
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-indigo-500"
          >
            {filteredRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name} · floor {room.floor} · {room.capacity} people
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-5 md:mt-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:block lg:self-start">
          <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
            Meeting rooms
          </p>
          <div className="space-y-1">
            {filteredRooms.map((room) => {
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
                  <span className="mt-1 flex items-center gap-3 text-xs text-slate-600">
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
              <p className="text-xs text-slate-600">
                {isMobile
                  ? `${DateTime.fromISO(selectedDay, { zone: OFFICE_TIME_ZONE }).toFormat("cccc, LLLL d")} · `
                  : ""}
                Office timezone: {OFFICE_TIME_ZONE}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => (isMobile ? moveDay(-1) : moveWeek(-1))}
                className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label={isMobile ? "Previous day" : "Previous week"}
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
                onClick={() => (isMobile ? moveDay(1) : moveWeek(1))}
                className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label={isMobile ? "Next day" : "Next week"}
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>

          {loadError && (
            <div role="alert" aria-live="assertive" className="m-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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

          <div
            className={isMobile ? "overflow-hidden" : "overflow-x-auto"}
            role="region"
            aria-label={isMobile ? "Daily meeting room calendar" : "Weekly meeting room calendar"}
            tabIndex={isMobile ? undefined : 0}
            onTouchStart={startSwipe}
            onTouchEnd={endSwipe}
          >
            <CalendarGrid
              weekStart={weekStart}
              mobileDay={isMobile ? selectedDay : undefined}
              userZone={userZone ?? "UTC"}
              bookings={bookings}
              loading={loading}
              onSelect={openBooking}
              onCancel={setBookingToCancel}
            />
          </div>
        </section>
      </div>

      {selectedSlot && userZone && (
        <BookingDialog
          key={`${selectedSlot.officeDate}-${selectedSlot.startTime}`}
          rooms={filteredRooms}
          initialRoomId={roomId}
          slot={selectedSlot}
          userZone={userZone}
          returnFocus={bookingTrigger}
          onClose={() => setSelectedSlot(undefined)}
          onCreated={handleCreated}
        />
      )}
      {bookingToCancel && (
        <CancelBookingDialog
          booking={bookingToCancel}
          pending={cancelPending}
          onClose={() => setBookingToCancel(undefined)}
          onConfirm={(scope) => void cancelBooking(scope)}
        />
      )}
    </main>
  );
}

function CalendarGrid({
  weekStart,
  mobileDay,
  userZone,
  bookings,
  loading,
  onSelect,
  onCancel,
}: {
  weekStart: string;
  mobileDay?: string;
  userZone: string;
  bookings: BookingDto[];
  loading: boolean;
  onSelect: (slot: SelectedSlot) => void;
  onCancel: (booking: BookingDto) => void;
}) {
  const officeWeek = DateTime.fromISO(weekStart, { zone: OFFICE_TIME_ZONE });
  const days = mobileDay
    ? [DateTime.fromISO(mobileDay, { zone: OFFICE_TIME_ZONE })]
    : Array.from({ length: 7 }, (_, index) => officeWeek.plus({ days: index }));
  const gridStart = days[0].startOf("day");
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
      style={{
        gridTemplateColumns: mobileDay
          ? "64px minmax(0, 1fr)"
          : "72px repeat(7, minmax(138px, 1fr))",
        gridTemplateRows: "68px repeat(20, 48px)",
      }}
      className={`relative grid bg-slate-200 gap-px ${mobileDay ? "min-w-0" : "min-w-[1050px]"}`}
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
              className="sticky left-0 z-20 flex items-start justify-end bg-white pr-3 pt-1 text-[11px] font-medium text-slate-600"
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
        const dayIndex = Math.floor(startOffice.startOf("day").diff(gridStart, "days").days);
        const startSlot =
          (startOffice.hour * 60 + startOffice.minute - OFFICE_START_HOUR * 60) /
          SLOT_MINUTES;
        const durationSlots = Math.max(1, endOffice.diff(startOffice, "minutes").minutes / SLOT_MINUTES);

        if (dayIndex < 0 || dayIndex >= days.length || startSlot < 0 || startSlot >= 20) return null;

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
            {booking.series && (
              <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-70">
                Weekly · {booking.series.occurrence}/{booking.series.count}
              </span>
            )}
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

function EmptyRooms({
  filtered,
  onReset,
}: {
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <CalendarPlus className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-slate-950">
        {filtered ? "No rooms match this capacity" : "No rooms available"}
      </h1>
      <p className="mt-2 text-slate-500">
        {filtered
          ? "Lower the minimum capacity to see more meeting rooms."
          : "Run the database seed to create the office rooms."}
      </p>
      {filtered && (
        <button type="button" onClick={onReset} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          Show every room
        </button>
      )}
    </main>
  );
}

function localSlotLabel(officeDate: string, officeTime: string, userZone: string) {
  return DateTime.fromISO(`${officeDate}T${officeTime}`, { zone: OFFICE_TIME_ZONE })
    .setZone(userZone)
    .toFormat("HH:mm");
}
