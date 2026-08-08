"use client";

import { LoaderCircle, Repeat2, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";
import type { BookingDto } from "@/lib/types";

export function CancelBookingDialog({
  booking,
  pending,
  onClose,
  onConfirm,
}: {
  booking: BookingDto;
  pending: boolean;
  onClose: () => void;
  onConfirm: (scope: "occurrence" | "series") => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("CancelBooking");
  const tCommon = useTranslations("Common");
  useAccessibleDialog(dialogRef, onClose, pending);

  return (
    <div className="fixed inset-0 z-[60] grid items-end bg-slate-950/50 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <Trash2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="cancel-booking-title" className="text-xl font-semibold text-slate-950">
              {t("title")}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">{booking.title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label={tCommon("close")} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-600">
          {booking.series
            ? t("seriesDescription", { occurrence: booking.series.occurrence, count: booking.series.count })
            : t("singleDescription")}
        </p>

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm("occurrence")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {booking.series ? t("occurrence") : t("booking")}
          </button>
          {booking.series && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onConfirm("series")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60"
            >
              <Repeat2 className="size-4" /> {t("future")}
            </button>
          )}
          <button type="button" onClick={onClose} disabled={pending} data-dialog-initial-focus className="h-10 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
            {t("keep")}
          </button>
        </div>
      </div>
    </div>
  );
}
