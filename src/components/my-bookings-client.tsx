"use client";

import { DateTime } from "luxon";
import {
  CalendarClock,
  CalendarX2,
  ChevronRight,
  Clock3,
  Globe2,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useUserTimeZone } from "@/hooks/use-user-time-zone";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";
import type { BookingDto } from "@/lib/types";

type BookingPage = {
  bookings: BookingDto[];
  nextCursor: string | null;
};

export function MyBookingsClient() {
  const userZone = useUserTimeZone();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [upcoming, setUpcoming] = useState<BookingDto[]>([]);
  const [past, setPast] = useState<BookingDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInitial() {
      setLoading(true);
      setError(undefined);

      try {
        const [upcomingResponse, pastResponse] = await Promise.all([
          fetch("/api/me/bookings?status=upcoming", { signal: controller.signal }),
          fetch("/api/me/bookings?status=past", { signal: controller.signal }),
        ]);
        const upcomingData = (await upcomingResponse.json()) as BookingPage & {
          error?: { message?: string };
        };
        const pastData = (await pastResponse.json()) as BookingPage & {
          error?: { message?: string };
        };

        if (!upcomingResponse.ok || !pastResponse.ok) {
          throw new Error(
            upcomingData.error?.message ??
              pastData.error?.message ??
              "Could not load your bookings.",
          );
        }

        setUpcoming(upcomingData.bookings);
        setPast(pastData.bookings);
        setNextCursor(pastData.nextCursor);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error ? loadError.message : "Could not load your bookings.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadInitial();
    return () => controller.abort();
  }, [refreshKey]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);

    try {
      const response = await fetch(
        `/api/me/bookings?status=past&cursor=${encodeURIComponent(nextCursor)}`,
      );
      const data = (await response.json()) as BookingPage & {
        error?: { message?: string };
      };
      if (!response.ok) throw new Error(data.error?.message ?? "Could not load more.");
      setPast((current) => [...current, ...data.bookings]);
      setNextCursor(data.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function cancelBooking(booking: BookingDto) {
    if (!window.confirm(`Cancel “${booking.title}”?`)) return;

    const response = await fetch(`/api/bookings/${booking.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json()) as { error?: { message?: string } };
      setError(data.error?.message ?? "Could not cancel the booking.");
      return;
    }

    setUpcoming((current) => current.filter((item) => item.id !== booking.id));
  }

  const visibleBookings = activeTab === "upcoming" ? upcoming : past;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-indigo-600">Personal schedule</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            My bookings
          </h1>
          <p className="mt-2 text-slate-500">
            Everything you booked, ordered around what matters next.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
          <Globe2 className="size-4 text-indigo-500" />
          {userZone ?? "Detecting timezone…"}
        </span>
      </div>

      <div className="mt-8 flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton
          active={activeTab === "upcoming"}
          onClick={() => setActiveTab("upcoming")}
          label="Upcoming"
          count={upcoming.length}
        />
        <TabButton
          active={activeTab === "past"}
          onClick={() => setActiveTab("past")}
          label="Past"
          count={past.length}
        />
      </div>

      {error && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="ml-auto inline-flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      <section className="mt-5 space-y-3" aria-busy={loading}>
        {loading ? (
          <BookingListSkeleton />
        ) : visibleBookings.length === 0 ? (
          <EmptyBookings status={activeTab} />
        ) : (
          visibleBookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              userZone={userZone ?? "UTC"}
              showCancel={activeTab === "upcoming"}
              onCancel={cancelBooking}
            />
          ))
        )}
      </section>

      {!loading && activeTab === "past" && nextCursor && (
        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingMore && <LoaderCircle className="size-4 animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </main>
  );
}

function BookingRow({
  booking,
  userZone,
  showCancel,
  onCancel,
}: {
  booking: BookingDto;
  userZone: string;
  showCancel: boolean;
  onCancel: (booking: BookingDto) => void;
}) {
  const start = DateTime.fromISO(booking.startAt).setZone(userZone);
  const end = DateTime.fromISO(booking.endAt).setZone(userZone);
  const officeWeek = DateTime.fromISO(booking.startAt)
    .setZone(OFFICE_TIME_ZONE)
    .startOf("week")
    .toISODate();
  const href = `/schedule?room=${booking.roomId}&week=${officeWeek}`;

  return (
    <article className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:flex-row sm:items-center sm:p-5">
      <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-center text-indigo-700">
        <span className="text-[10px] font-bold uppercase tracking-wider">{start.toFormat("LLL")}</span>
        <span className="-mt-2 text-lg font-bold">{start.day}</span>
      </div>

      <Link href={href} className="min-w-0 flex-1">
        <h2 className="truncate font-semibold text-slate-950 group-hover:text-indigo-700">
          {booking.title}
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4 text-slate-400" />
            {start.toFormat("ccc, LLL d · HH:mm")}–{end.toFormat("HH:mm")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-slate-400" />
            {booking.room.name}, floor {booking.room.floor}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {showCancel && (
          <button
            type="button"
            onClick={() => void onCancel(booking)}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            aria-label={`Cancel ${booking.title}`}
          >
            <Trash2 className="size-4" />
          </button>
        )}
        <Link
          href={href}
          className="grid size-10 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={`Open ${booking.title} in schedule`}
        >
          <ChevronRight className="size-5" />
        </Link>
      </div>
    </article>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition ${
        active ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
      <span className={`text-xs ${active ? "text-indigo-200" : "text-slate-400"}`}>{count}</span>
    </button>
  );
}

function BookingListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white p-5">
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyBookings({ status }: { status: "upcoming" | "past" }) {
  const isUpcoming = status === "upcoming";
  const Icon = isUpcoming ? CalendarClock : CalendarX2;

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">
        {isUpcoming ? "Nothing booked yet" : "No past bookings"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {isUpcoming
          ? "Pick a room and reserve your next focused conversation."
          : "Completed bookings will be kept here for easy reference."}
      </p>
      {isUpcoming && (
        <Link
          href="/schedule"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Open schedule <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
