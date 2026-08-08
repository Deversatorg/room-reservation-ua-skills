"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Toast = {
  id: string;
  message: string;
};

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 4_500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("Toasts");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string) => {
      nextId.current += 1;
      const id = `toast-${nextId.current}`;
      setToasts((current) => [...current.slice(-2), { id, message }]);
      const timer = window.setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
      timers.current.set(id, timer);
    },
    [dismissToast],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) window.clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] flex flex-col items-center gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="ui-enter pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-2xl shadow-emerald-950/10"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Check className="size-4" aria-hidden="true" />
            </span>
            <span role="status" className="min-w-0 flex-1">
              {toast.message}
            </span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={t("dismiss")}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
