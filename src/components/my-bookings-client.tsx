"use client";

import { DateTime } from "luxon";
import {
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ChevronRight,
  Clock3,
  Globe2,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Repeat2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useUserTimeZone } from "@/hooks/use-user-time-zone";
import type { ApiErrorCode } from "@/lib/api";
import { OFFICE_TIME_ZONE } from "@/lib/booking-rules";
import type { BookingDto } from "@/lib/types";
import { CancelBookingDialog } from "@/components/cancel-booking-dialog";
import { useToast } from "@/components/toast-provider";

type BookingPage = {
  bookings: BookingDto[];
  nextCursor: string | null;
};

export function MyBookingsClient() {
  const t = useTranslations("MyBookings");
  const tCommon = useTranslations("Common");
  const tApi = useTranslations("ApiErrors");
  const tToasts = useTranslations("Toasts");
  const { showToast } = useToast();
  const userZone = useUserTimeZone();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [upcoming, setUpcoming] = useState<BookingDto[]>([]);
  const [past, setPast] = useState<BookingDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookingToCancel, setBookingToCancel] = useState<BookingDto>();
  const [cancelPending, setCancelPending] = useState(false);

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
          error?: { code?: ApiErrorCode };
        };
        const pastData = (await pastResponse.json()) as BookingPage & {
          error?: { code?: ApiErrorCode };
        };

        if (!upcomingResponse.ok || !pastResponse.ok) {
          throw new Error(
            upcomingData.error?.code
              ? tApi(upcomingData.error.code)
              : pastData.error?.code
                ? tApi(pastData.error.code)
                : t("loadFailed"),
          );
        }

        setUpcoming(upcomingData.bookings);
        setPast(pastData.bookings);
        setNextCursor(pastData.nextCursor);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error ? loadError.message : t("loadFailed"),
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadInitial();
    return () => controller.abort();
  }, [refreshKey, t, tApi]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);

    try {
      const response = await fetch(
        `/api/me/bookings?status=past&cursor=${encodeURIComponent(nextCursor)}`,
      );
      const data = (await response.json()) as BookingPage & {
        error?: { code?: ApiErrorCode };
      };
      if (!response.ok) {
        throw new Error(data.error?.code ? tApi(data.error.code) : t("loadMoreFailed"));
      }
      setPast((current) => [...current, ...data.bookings]);
      setNextCursor(data.nextCursor);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("loadMoreFailed"));
    } finally {
      setLoadingMore(false);
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
        const data = (await response.json()) as { error?: { code?: ApiErrorCode } };
        setError(data.error?.code ? tApi(data.error.code) : t("cancelFailed"));
        return;
      }

      const seriesId = bookingToCancel.series?.id;
      setUpcoming((current) =>
        current.filter((item) =>
          scope === "series" && seriesId
            ? item.series?.id !== seriesId
            : item.id !== bookingToCancel.id,
        ),
      );
      setBookingToCancel(undefined);
      showToast(
        scope === "series"
          ? tToasts("bookingSeriesCancelled")
          : tToasts("bookingCancelled"),
      );
    } catch {
      setError(tCommon("serverUnavailable"));
    } finally {
      setCancelPending(false);
    }
  }

  const visibleBookings = activeTab === "upcoming" ? upcoming : past;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="ui-enter flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-indigo-700">
            <CalendarDays className="size-3.5" /> {t("eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 text-slate-500">
            {t("description")}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-sm text-slate-600 shadow-[0_4px_16px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 backdrop-blur">
          <Globe2 className="size-4 text-indigo-500" />
          {userZone ?? tCommon("detectingTimezone")}
        </span>
      </div>

      <div className="ui-enter mt-8 flex w-fit rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/70 [animation-delay:70ms]">
        <TabButton
          active={activeTab === "upcoming"}
          onClick={() => setActiveTab("upcoming")}
          label={t("upcoming")}
          count={upcoming.length}
        />
        <TabButton
          active={activeTab === "past"}
          onClick={() => setActiveTab("past")}
          label={t("past")}
          count={past.length}
        />
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="mt-5 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="ml-auto inline-flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="size-4" /> {tCommon("retry")}
          </button>
        </div>
      )}

      <section className="ui-enter mt-5 space-y-3 [animation-delay:110ms]" aria-busy={loading}>
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
              onCancel={setBookingToCancel}
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
            {t("loadMore")}
          </button>
        </div>
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
  const locale = useLocale();
  const t = useTranslations("MyBookings");
  const start = DateTime.fromISO(booking.startAt).setZone(userZone).setLocale(locale);
  const end = DateTime.fromISO(booking.endAt).setZone(userZone).setLocale(locale);
  const officeStart = DateTime.fromISO(booking.startAt).setZone(OFFICE_TIME_ZONE);
  const officeWeek = officeStart
    .startOf("week")
    .toISODate();
  const officeDay = officeStart.toISODate();
  const href = `/schedule?room=${booking.roomId}&week=${officeWeek}&day=${officeDay}`;

  return (
    <article className="group flex flex-col gap-4 rounded-3xl border border-white/80 bg-white/90 p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:ring-indigo-200 hover:shadow-[0_14px_36px_rgba(79,70,229,0.10)] sm:flex-row sm:items-center sm:p-5">
      <div
        className={`grid size-14 shrink-0 place-items-center rounded-2xl text-center ring-1 ${
          showCancel
            ? "bg-slate-950 text-white ring-slate-800 shadow-lg shadow-slate-950/15"
            : "bg-slate-100 text-slate-600 ring-slate-200"
        }`}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider">{start.toFormat("LLL")}</span>
        <span className="-mt-2 text-lg font-bold">{start.day}</span>
      </div>

      <Link href={href} className="min-w-0 flex-1">
        <h2 className="truncate font-semibold text-slate-950 group-hover:text-indigo-700">
          {booking.title}
        </h2>
        {booking.series && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
            <Repeat2 className="size-3" /> {t("weekly", { occurrence: booking.series.occurrence, count: booking.series.count })}
          </span>
        )}
        <div className="mt-2.5 flex flex-wrap gap-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
            <Clock3 className="size-4 text-slate-400" />
            {start.toLocaleString({ weekday: "short", month: "short", day: "numeric" })} · {start.toFormat("HH:mm")}–{end.toFormat("HH:mm")}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 ring-1 ring-slate-100">
            <MapPin className="size-4 text-slate-400" />
            {t("roomFloor", { room: booking.room.name, floor: booking.room.floor })}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 self-end sm:self-auto">
        {showCancel && (
          <button
            type="button"
            onClick={() => void onCancel(booking)}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            aria-label={t("cancelLabel", { title: booking.title })}
          >
            <Trash2 className="size-4" />
          </button>
        )}
        <Link
          href={href}
          className="grid size-10 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={t("openLabel", { title: booking.title })}
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
      className={`flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
        active
          ? "bg-slate-950 text-white shadow-md shadow-slate-950/15"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {label}
      <span className={`text-xs ${active ? "text-indigo-50" : "text-slate-600"}`}>{count}</span>
    </button>
  );
}

function BookingListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-3xl border border-white/80 bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70">
          <div className="h-4 w-1/3 rounded bg-slate-100" />
          <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyBookings({ status }: { status: "upcoming" | "past" }) {
  const t = useTranslations("MyBookings");
  const isUpcoming = status === "upcoming";
  const Icon = isUpcoming ? CalendarClock : CalendarX2;

  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white/90 px-6 py-16 text-center shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
        <Icon className="size-6" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">
        {isUpcoming ? t("emptyUpcomingTitle") : t("emptyPastTitle")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {isUpcoming
          ? t("emptyUpcomingDescription")
          : t("emptyPastDescription")}
      </p>
      {isUpcoming && (
        <Link
          href="/schedule"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          {t("openSchedule")} <ChevronRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
