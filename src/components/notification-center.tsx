"use client";

import { Bell, CheckCheck, Clock3, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { NotificationDto } from "@/lib/types";

const POLL_INTERVAL_MS = 15_000;

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [toasts, setToasts] = useState<NotificationDto[]>([]);

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/poll", { method: "POST" });
      if (!response.ok) return;
      const data = (await response.json()) as { notifications: NotificationDto[] };
      if (data.notifications.length === 0) return;

      setNotifications((current) => mergeNotifications(data.notifications, current));
      setToasts((current) => mergeNotifications(data.notifications, current));
      for (const notification of data.notifications) {
        window.setTimeout(() => {
          setToasts((current) => current.filter((item) => item.id !== notification.id));
        }, 8_000);
      }
    } catch {
      // Polling is intentionally silent; page-level data remains usable offline.
    }
  }, []);

  useEffect(() => {
    const initialPoll = window.setTimeout(() => void poll(), 0);
    const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    const onFocus = () => void poll();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void poll();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initialPoll);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [poll]);

  async function togglePanel() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;

    try {
      const response = await fetch("/api/notifications");
      if (!response.ok) return;
      const data = (await response.json()) as { notifications: NotificationDto[] };
      setNotifications(data.notifications);
      const unread = data.notifications.filter((notification) => !notification.readAt);
      await Promise.all(
        unread.map((notification) =>
          fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" }),
        ),
      );
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? readAt,
        })),
      );
    } catch {
      // The next panel open retries history loading.
    }
  }

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void togglePanel()}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {Math.min(unreadCount, 9)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center border-b border-slate-100 px-4 py-3">
            <div>
              <p className="font-semibold text-slate-950">Notifications</p>
              <p className="text-xs text-slate-600">Meeting handoff reminders</p>
            </div>
            <CheckCheck className="ml-auto size-4 text-indigo-500" />
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-600">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))
            )}
          </div>
        </div>
      )}

      <div aria-live="polite" className="fixed bottom-4 right-4 z-[80] grid w-[min(380px,calc(100vw-2rem))] gap-2">
        {toasts.map((notification) => (
          <div key={notification.id} className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                <Clock3 className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-950">Your meeting ends soon</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {notification.roomName} is booked next for “{notification.nextTitle}”.
                </p>
              </div>
              <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== notification.id))} aria-label="Dismiss notification" className="grid size-8 place-items-center text-slate-500">
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationItem({ notification }: { notification: NotificationDto }) {
  return (
    <article className="rounded-xl px-3 py-3 hover:bg-slate-50">
      <p className="text-sm font-semibold text-slate-800">{notification.currentTitle}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Ends at {new Date(notification.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} in {notification.roomName}. Next: {notification.nextTitle}.
      </p>
    </article>
  );
}

function mergeNotifications(first: NotificationDto[], second: NotificationDto[]) {
  const byId = new Map([...first, ...second].map((notification) => [notification.id, notification]));
  return [...byId.values()];
}
