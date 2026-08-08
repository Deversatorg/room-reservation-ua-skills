import { Clock3, Globe2, ShieldCheck } from "lucide-react";

import { Brand } from "@/components/brand";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getTranslations } from "next-intl/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("AuthLayout");

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-1/3 size-80 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -right-28 -top-24 size-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <Brand inverse />
        <div className="absolute right-8 top-8">
          <LanguageSwitcher inverse />
        </div>

        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">
            {t("eyebrow")}
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight text-white">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            {t("description")}
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            <AuthFeature icon={Clock3} label={t("slots")} />
            <AuthFeature icon={Globe2} label={t("timezone")} />
            <AuthFeature icon={ShieldCheck} label={t("conflict")} />
          </div>
        </div>

        <p className="relative text-sm text-slate-400">UA-Skills · event2</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center justify-between gap-4">
              <Brand />
              <LanguageSwitcher />
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

function AuthFeature({
  icon: Icon,
  label,
}: {
  icon: typeof Clock3;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <Icon className="mb-3 size-5 text-indigo-300" />
      <p className="text-sm font-medium text-slate-200">{label}</p>
    </div>
  );
}
