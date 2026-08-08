"use client";

import { CalendarRange, ListChecks } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const navigation = [
    { href: "/schedule", icon: CalendarRange, label: t("schedule") },
    { href: "/my-bookings", icon: ListChecks, label: t("myBookings") },
  ] as const;

  return (
    <nav
      aria-label={t("primary")}
      className={
        mobile
          ? "grid flex-1 grid-cols-2 gap-1"
          : "ml-2 hidden items-center gap-1 sm:flex"
      }
    >
      {navigation.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition sm:justify-start ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <Icon className="size-4" />
            {label}
            {active ? (
              <span className="absolute inset-x-4 -bottom-2 h-0.5 rounded-full bg-indigo-500 sm:-bottom-[17px]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
