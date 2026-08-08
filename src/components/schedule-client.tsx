"use client";

import { DateTime } from "luxon";
import {
  Building2,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  LoaderCircle,
  MapPin,
  Plus,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
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
import { BookingDetailsDialog } from "@/components/booking-details-dialog";
import { CancelBookingDialog } from "@/components/cancel-booking-dialog";
import {
  BookingDialog,
  type SelectedSlot,
} from "@/components/schedule/booking-dialog";
import { FindRoomDialog } from "@/components/schedule/find-room-dialog";
import { useUserTimeZone } from "@/hooks/use-user-time-zone";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  getLocalOfficeDayPresentation,
  localSlotTimeLabel,
} from "@/lib/calendar-time";
import type { ApiErrorCode } from "@/lib/api";
import type { AvailabilityOption, BookingDto, RoomDto } from "@/lib/types";

const ROOM_ACCENTS = [
  "bg-cyan-50 text-cyan-700 ring-cyan-100",
  "bg-violet-50 text-violet-700 ring-violet-100",
  "bg-amber-50 text-amber-700 ring-amber-100",
  "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "bg-rose-50 text-rose-700 ring-rose-100",
  "bg-blue-50 text-blue-700 ring-blue-100",
] as const;

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
  const locale = useLocale();
  const t = useTranslations("Schedule");
  const tCommon = useTranslations("Common");
  const tApi = useTranslations("ApiErrors");
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
  const [finderOpen, setFinderOpen] = useState(false);
  const [bookingTrigger, setBookingTrigger] = useState<HTMLElement | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingDto>();
  const [cancelPending, setCancelPending] = useState(false);
  const filteredRooms = useMemo(
    () => rooms.filter((room) => room.capacity >= minCapacity),
    [minCapacity, rooms],
  );
  const selectedRoom =
    filteredRooms.find((room) => room.id === roomId) ?? filteredRooms[0];
  const selectedRoomIndex = Math.max(
    0,
    rooms.findIndex((room) => room.id === selectedRoom?.id),
  );
  const mobileLocalDay = userZone
    ? getLocalOfficeDayPresentation(selectedDay, userZone, locale)
    : null;
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
          error?: { code?: ApiErrorCode };
        };

        if (!response.ok) {
          throw new Error(data.error?.code ? tApi(data.error.code) : t("loadFailed"));
        }
        setBookings(data.bookings ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadError(error instanceof Error ? error.message : t("loadFailed"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadBookings();
    return () => controller.abort();
  }, [roomId, weekStart, refreshKey, t, tApi]);

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
    if (!selectedBooking?.canCancel) return;
    setCancelPending(true);
    try {
      const response = await fetch(
        `/api/bookings/${selectedBooking.id}?scope=${scope}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: { code?: ApiErrorCode } };
        window.alert(data.error?.code ? tApi(data.error.code) : t("cancelFailed"));
        return;
      }

      setSelectedBooking(undefined);
      setRefreshKey((value) => value + 1);
    } catch {
      window.alert(tCommon("serverUnavailable"));
    } finally {
      setCancelPending(false);
    }
  }

  function handleCreated(nextRoomId: string, officeDate: string) {
    const nextWeek = DateTime.fromISO(officeDate, { zone: OFFICE_TIME_ZONE })
      .startOf("week")
      .toISODate()!;
    setSelectedSlot(undefined);
    const nextCapacity = rooms.some(
      (room) => room.id === nextRoomId && room.capacity >= minCapacity,
    )
      ? minCapacity
      : 0;
    updateLocation(nextRoomId, nextWeek, officeDate, nextCapacity);
    setRefreshKey((value) => value + 1);
  }

  function openBooking(slot: SelectedSlot) {
    setBookingTrigger(
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    );
    setSelectedSlot(slot);
  }

  function openFinder() {
    setBookingTrigger(
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    );
    setFinderOpen(true);
  }

  function chooseAvailability(option: AvailabilityOption, capacity: number) {
    setFinderOpen(false);
    setSelectedSlot({
      officeDate: option.officeDate,
      startTime: option.startTime,
      endTime: option.endTime,
      roomId: option.room.id,
      minCapacity: capacity,
    });
  }

  if (!selectedRoom) {
    return (
      <EmptyRooms filtered={minCapacity > 0} onReset={() => changeCapacity(0)} />
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
      <div className="ui-enter flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
            <span className="soft-pulse size-2 rounded-full bg-emerald-500" />
            {t("live")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            {t("title")}
          </h1>
          <div className="mt-2 hidden flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500 sm:flex">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4 text-indigo-500" />
              {t("roomsInView", { count: filteredRooms.length })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-4 text-indigo-500" />
              {t("officeHours")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 text-sm text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 backdrop-blur">
            <SlidersHorizontal className="size-4 text-indigo-500" />
            <span className="sr-only sm:not-sr-only">{t("minimumCapacity")}</span>
            <select
              aria-label={t("minimumCapacityLabel")}
              value={minCapacity}
              onChange={(event) => changeCapacity(Number(event.target.value))}
              className="bg-transparent font-semibold text-slate-700 outline-none"
            >
              <option value={0}>{t("anySize")}</option>
              {[4, 6, 8, 10, 12, 16].map((capacity) => (
                <option key={capacity} value={capacity}>{t("capacityOption", { count: capacity })}</option>
              ))}
            </select>
          </label>
          <span className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-sm text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 backdrop-blur">
            <Globe2 className="size-4 text-indigo-500" />
            {userZone ?? tCommon("detectingTimezone")}
          </span>
          <button
            type="button"
            onClick={openFinder}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-[0_4px_16px_rgba(79,70,229,0.08)] transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50"
          >
            <Search className="size-4" /> {t("findRoom")}
          </button>
          <button
            type="button"
            onClick={() =>
              openBooking({
                officeDate: DateTime.now().setZone(OFFICE_TIME_ZONE).toISODate()!,
                startTime: "09:00",
              })
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-600/25"
          >
            <Plus className="size-4" /> {t("newBooking")}
          </button>
        </div>
      </div>

      <div className="ui-enter mt-6 rounded-3xl border border-white/80 bg-white/90 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 backdrop-blur md:hidden">
        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
          <span className="flex items-center gap-2 px-1">
            <Building2 className="size-4 text-indigo-500" /> {t("meetingRoom")}
          </span>
          <select
            value={roomId}
            onChange={(event) => updateLocation(event.target.value, weekStart)}
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-base font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-indigo-500"
          >
            {filteredRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {t("roomOption", { name: room.name, floor: room.floor, capacity: room.capacity })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="ui-enter mt-4 grid gap-5 [animation-delay:80ms] md:mt-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden rounded-3xl border border-white/80 bg-white/90 p-3 shadow-[0_12px_40px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 backdrop-blur md:block lg:sticky lg:top-24 lg:self-start">
          <div className="flex items-center justify-between px-2 pb-3 pt-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
              {t("meetingRooms")}
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
              {filteredRooms.length}
            </span>
          </div>
          <div className="space-y-1">
            {filteredRooms.map((room, roomIndex) => {
              const active = room.id === roomId;
              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => updateLocation(room.id, weekStart)}
                  className={`group w-full rounded-2xl px-3 py-3 text-left transition ${
                    active
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold ring-1 ${
                        active
                          ? "bg-white/10 text-white ring-white/10"
                          : ROOM_ACCENTS[roomIndex % ROOM_ACCENTS.length]
                      }`}
                    >
                      {room.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{room.name}</span>
                      <span
                        className={`mt-0.5 flex items-center gap-3 text-xs ${
                          active ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" /> {tCommon("floor", { floor: room.floor })}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" /> {room.capacity}
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-3xl border border-white/80 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/70">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200/80 bg-gradient-to-r from-white via-white to-indigo-50/40 px-4 py-3.5 sm:px-5">
            <span
              className={`hidden size-10 shrink-0 place-items-center rounded-xl ring-1 sm:grid ${ROOM_ACCENTS[selectedRoomIndex % ROOM_ACCENTS.length]}`}
            >
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-slate-950">{selectedRoom.name}</p>
              <p className="text-xs text-slate-600">
                {isMobile
                  ? `${mobileLocalDay?.longDate ?? selectedDay} · `
                  : ""}
                {tCommon("officeTimezone", { timezone: OFFICE_TIME_ZONE })}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-3 text-[11px] font-semibold text-slate-500 xl:flex">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400" /> {t("available")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-indigo-500" /> {t("booked")}
                </span>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => (isMobile ? moveDay(-1) : moveWeek(-1))}
                className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label={isMobile ? t("previousDay") : t("previousWeek")}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-8 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {t("today")}
              </button>
              <button
                type="button"
                onClick={() => (isMobile ? moveDay(1) : moveWeek(1))}
                className="grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label={isMobile ? t("nextDay") : t("nextWeek")}
              >
                <ChevronRight className="size-5" />
              </button>
              </div>
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
                <RefreshCw className="size-4" /> {tCommon("retry")}
              </button>
            </div>
          )}

          <div
            className={isMobile ? "overflow-hidden" : "overflow-x-auto"}
            role="region"
            aria-label={isMobile ? t("dailyCalendar") : t("weeklyCalendar")}
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
              onBookingClick={setSelectedBooking}
            />
          </div>
        </section>
      </div>

      {finderOpen ? (
        userZone ? (
          <FindRoomDialog
            initialDate={selectedDay}
            initialCapacity={minCapacity}
            userZone={userZone}
            returnFocus={bookingTrigger}
            onClose={() => setFinderOpen(false)}
            onSelect={chooseAvailability}
          />
        ) : null
      ) : null}
      {selectedSlot && userZone && (
        <BookingDialog
          key={`${selectedSlot.roomId ?? roomId}-${selectedSlot.officeDate}-${selectedSlot.startTime}-${selectedSlot.endTime ?? ""}`}
          rooms={
            selectedSlot.minCapacity
              ? rooms.filter(
                  (room) => room.capacity >= (selectedSlot.minCapacity ?? 0),
                )
              : filteredRooms
          }
          initialRoomId={selectedSlot.roomId ?? roomId}
          slot={selectedSlot}
          userZone={userZone}
          returnFocus={bookingTrigger}
          onClose={() => setSelectedSlot(undefined)}
          onCreated={handleCreated}
        />
      )}
      {selectedBooking ? (
        selectedBooking.canCancel ? (
          <CancelBookingDialog
            booking={selectedBooking}
            pending={cancelPending}
            onClose={() => setSelectedBooking(undefined)}
            onConfirm={(scope) => void cancelBooking(scope)}
          />
        ) : userZone ? (
          <BookingDetailsDialog
            booking={selectedBooking}
            userZone={userZone}
            onClose={() => setSelectedBooking(undefined)}
          />
        ) : null
      ) : null}
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
  onBookingClick,
}: {
  weekStart: string;
  mobileDay?: string;
  userZone: string;
  bookings: BookingDto[];
  loading: boolean;
  onSelect: (slot: SelectedSlot) => void;
  onBookingClick: (booking: BookingDto) => void;
}) {
  const locale = useLocale();
  const t = useTranslations("Schedule");
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
      className={`relative grid gap-px bg-slate-200/80 ${mobileDay ? "min-w-0" : "min-w-[1050px]"}`}
      aria-busy={loading}
    >
      <div className="sticky left-0 z-30 bg-slate-50/95" />
      {days.map((day, dayIndex) => {
        const localDay = getLocalOfficeDayPresentation(day.toISODate()!, userZone, locale);
        const isToday = day.toISODate() === nowOffice.toISODate();
        return (
          <div
            key={day.toISODate()}
            style={{ gridColumn: dayIndex + 2, gridRow: 1 }}
            className={`flex flex-col items-center justify-center ${
              isToday
                ? "bg-gradient-to-b from-indigo-50 to-white text-indigo-700"
                : "bg-slate-50/95 text-slate-600"
            }`}
          >
            <span className="text-xs font-bold uppercase tracking-[0.12em]">
              {localDay.headerWeekday}
            </span>
            <span
              className={`mt-1 grid min-h-8 min-w-8 place-items-center rounded-full px-1 text-sm font-semibold ${localDay.crossesDate ? "text-[11px]" : ""} ${isToday ? "bg-indigo-600 text-white" : ""}`}
            >
              {localDay.headerDate}
            </span>
          </div>
        );
      })}

      {slots.map((time, slotIndex) => {
        const localTime = localSlotTimeLabel(days[0].toISODate()!, time, userZone);
        return (
          <div key={time} className="contents">
            <div
              style={{ gridColumn: 1, gridRow: slotIndex + 2 }}
              className="sticky left-0 z-20 flex items-start justify-end bg-slate-50/95 pr-3 pt-1 text-[11px] font-semibold text-slate-500"
            >
              {localTime}
            </div>
            {days.map((day, dayIndex) => {
              const officeDate = day.toISODate()!;
              const slotStart = DateTime.fromISO(`${officeDate}T${time}`, {
                zone: OFFICE_TIME_ZONE,
              });
              const slotEnd = slotStart.plus({ minutes: SLOT_MINUTES });
              const localSlot = slotStart.setZone(userZone).setLocale(locale);
              const occupied = bookings.some(
                (booking) =>
                  DateTime.fromISO(booking.startAt) < slotEnd &&
                  DateTime.fromISO(booking.endAt) > slotStart,
              );
              const isCurrent =
                officeDate === nowOffice.toISODate() && slotIndex === currentSlot;
              const isTodayColumn = officeDate === nowOffice.toISODate();
              return (
                <button
                  key={`${officeDate}-${time}`}
                  type="button"
                  disabled={occupied || loading}
                  onClick={() => onSelect({ officeDate, startTime: time })}
                  style={{ gridColumn: dayIndex + 2, gridRow: slotIndex + 2 }}
                  className={`relative transition disabled:cursor-default ${
                    isTodayColumn
                      ? "bg-indigo-50/25 hover:bg-indigo-50/80"
                      : "bg-white hover:bg-indigo-50/70"
                  } ${
                    isCurrent
                      ? "after:absolute after:left-0 after:right-0 after:top-0 after:h-0.5 after:bg-rose-500 after:shadow-[0_0_8px_rgba(244,63,94,0.65)]"
                      : ""
                  }`}
                  aria-label={t("bookSlot", {
                    time: localSlot.toFormat("HH:mm"),
                    date: localSlot.toLocaleString({ weekday: "long", month: "long", day: "numeric" }),
                  })}
                />
              );
            })}
          </div>
        );
      })}

      {bookings.map((booking) => {
        const startOffice = DateTime.fromISO(booking.startAt).setZone(OFFICE_TIME_ZONE);
        const endOffice = DateTime.fromISO(booking.endAt).setZone(OFFICE_TIME_ZONE);
        const startLocal = DateTime.fromISO(booking.startAt).setZone(userZone).setLocale(locale);
        const localDay = getLocalOfficeDayPresentation(
          startOffice.toISODate()!,
          userZone,
          locale,
        );
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
            onClick={() => onBookingClick(booking)}
            title={booking.canCancel ? t("cancelBookingTitle") : t("viewBookingTitle")}
            aria-label={booking.canCancel
              ? t("cancelBookingLabel", { title: booking.title, author: booking.author.name })
              : t("viewBookingLabel", { title: booking.title, author: booking.author.name })}
            style={{
              gridColumn: dayIndex + 2,
              gridRow: `${startSlot + 2} / span ${durationSlots}`,
            }}
            className={`z-10 m-1 overflow-hidden rounded-xl border-l-[3px] px-2.5 py-1.5 text-left shadow-[0_4px_12px_rgba(15,23,42,0.10)] transition hover:-translate-y-px hover:shadow-md ${
              booking.canCancel
                ? "border-indigo-600 bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-950 hover:from-indigo-200 hover:to-violet-100"
                : "border-slate-500 bg-gradient-to-br from-slate-100 to-slate-50 text-slate-800 hover:from-slate-200 hover:to-slate-100"
            }`}
          >
            <span className="block truncate text-xs font-bold">{booking.title}</span>
            <span className="mt-0.5 block truncate text-[10px] opacity-70">
              {startLocal.toFormat(localDay.crossesDate ? "ccc HH:mm" : "HH:mm")} ·{" "}
              {booking.author.name}
            </span>
            {booking.series && (
              <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-70">
                {t("weeklyOccurrence", { occurrence: booking.series.occurrence, count: booking.series.count })}
              </span>
            )}
          </button>
        );
      })}

      {loading && (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-white/55 backdrop-blur-[2px]">
          <span className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-xl ring-1 ring-slate-200/70">
            <LoaderCircle className="size-4 animate-spin text-indigo-600" /> {t("loading")}
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
  const t = useTranslations("Schedule");
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <CalendarPlus className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-slate-950">
        {filtered ? t("noCapacityTitle") : t("noRoomsTitle")}
      </h1>
      <p className="mt-2 text-slate-500">
        {filtered
          ? t("noCapacityDescription")
          : t("noRoomsDescription")}
      </p>
      {filtered && (
        <button type="button" onClick={onReset} className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white">
          {t("showAll")}
        </button>
      )}
    </main>
  );
}
