"use client";

import { useSyncExternalStore } from "react";

export function useUserTimeZone() {
  return useSyncExternalStore(
    subscribeToTimeZone,
    getBrowserTimeZone,
    getServerTimeZone,
  );
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
