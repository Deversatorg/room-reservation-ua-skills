import Link from "next/link";
import { CalendarRange, ListChecks } from "lucide-react";

import { Brand } from "@/components/brand";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { LogoutButton } from "@/components/logout-button";
import { NotificationCenter } from "@/components/notification-center";
import { requirePageUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            <NavItem href="/schedule" icon={CalendarRange} label="Schedule" />
            <NavItem href="/my-bookings" icon={ListChecks} label="My bookings" />
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <NotificationCenter />
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <LogoutButton />
          </div>
        </div>
        <nav className="flex border-t border-slate-100 px-3 py-2 sm:hidden">
          <NavItem href="/schedule" icon={CalendarRange} label="Schedule" />
          <NavItem href="/my-bookings" icon={ListChecks} label="My bookings" />
        </nav>
      </header>
      {!user.emailVerified && <EmailVerificationBanner />}
      {children}
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof CalendarRange;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
