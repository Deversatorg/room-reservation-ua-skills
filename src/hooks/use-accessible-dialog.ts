"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useAccessibleDialog(
  containerRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  escapeDisabled = false,
  returnFocus?: HTMLElement | null,
) {
  const onCloseRef = useRef(onClose);
  const escapeDisabledRef = useRef(escapeDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    escapeDisabledRef.current = escapeDisabled;
  }, [escapeDisabled]);

  useEffect(() => {
    const previouslyFocused =
      returnFocus ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (event.key === "Escape" && !escapeDisabledRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (
        event.shiftKey &&
        (document.activeElement === first || !container.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !container.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    if (!containerRef.current?.contains(document.activeElement)) {
      const initialFocus =
        containerRef.current?.querySelector<HTMLElement>("[data-dialog-initial-focus]") ??
        containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      initialFocus?.focus();
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [containerRef, returnFocus]);
}
