export const DEFAULT_NOTIFY_BEFORE_MINUTES = 10;

export function parseNotifyBeforeMinutes(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 60
    ? parsed
    : DEFAULT_NOTIFY_BEFORE_MINUTES;
}

export function isNotificationEligible({
  currentEndAt,
  nextStartAt,
  currentCancelledAt,
  nextCancelledAt,
  now,
  notifyBeforeMinutes,
}: {
  currentEndAt: Date;
  nextStartAt: Date;
  currentCancelledAt: Date | null;
  nextCancelledAt: Date | null;
  now: Date;
  notifyBeforeMinutes: number;
}) {
  if (currentCancelledAt || nextCancelledAt) return false;
  if (nextStartAt.getTime() !== currentEndAt.getTime()) return false;

  const windowStart = currentEndAt.getTime() - notifyBeforeMinutes * 60_000;
  return now.getTime() >= windowStart && now < currentEndAt;
}
