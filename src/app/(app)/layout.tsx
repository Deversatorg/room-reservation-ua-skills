import { AppNavigation } from "@/components/app-navigation";
import { Brand } from "@/components/brand";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationCenter } from "@/components/notification-center";
import { ToastProvider } from "@/components/toast-provider";
import { requirePageUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(224,231,255,0.42),_transparent_30rem)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 shadow-[0_1px_18px_rgba(15,23,42,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1600px] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Brand />
          <AppNavigation />
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <NotificationCenter />
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-600">{user.email}</p>
            </div>
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 text-sm font-bold text-indigo-700 ring-1 ring-indigo-100">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <LogoutButton />
          </div>
        </div>
        <div className="flex border-t border-slate-100 px-3 py-2 sm:hidden">
          <AppNavigation mobile />
          <LanguageSwitcher />
        </div>
      </header>
      {!user.emailVerified && <EmailVerificationBanner />}
      <ToastProvider>{children}</ToastProvider>
    </div>
  );
}
