"use client";

import { LoaderCircle, Repeat2, Trash2, X } from "lucide-react";

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
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <Trash2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="cancel-booking-title" className="text-xl font-semibold text-slate-950">
              Cancel booking?
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">{booking.title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-600">
          {booking.series
            ? `This is occurrence ${booking.series.occurrence} of ${booking.series.count}. Choose whether to cancel only this occurrence or every future occurrence in the series.`
            : "The room will become available for this time. This action cannot be undone."}
        </p>

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm("occurrence")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {booking.series ? "Cancel this occurrence" : "Cancel booking"}
          </button>
          {booking.series && (
            <button
              type="button"
              disabled={pending}
              onClick={() => onConfirm("series")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60"
            >
              <Repeat2 className="size-4" /> Cancel all future occurrences
            </button>
          )}
          <button type="button" onClick={onClose} disabled={pending} className="h-10 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
            Keep booking
          </button>
        </div>
      </div>
    </div>
  );
}
