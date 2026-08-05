import { Clock3, Globe2, ShieldCheck } from "lucide-react";

import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 top-1/3 size-80 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -right-28 -top-24 size-96 rounded-full bg-cyan-400/15 blur-3xl" />
        <Brand inverse />

        <div className="relative max-w-xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-indigo-300">
            One room. One slot. Zero confusion.
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight text-white">
            Make space for work that matters.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Browse every meeting room, understand availability at a glance, and book
            time without timezone surprises.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            <AuthFeature icon={Clock3} label="30 min slots" />
            <AuthFeature icon={Globe2} label="Timezone aware" />
            <AuthFeature icon={ShieldCheck} label="Conflict safe" />
          </div>
        </div>

        <p className="relative text-sm text-slate-500">UA-Skills · event2</p>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand />
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
