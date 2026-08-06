import { CalendarDays } from "lucide-react";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-10 place-items-center rounded-xl shadow-sm ${
          inverse
            ? "bg-white/15 text-white ring-1 ring-white/10"
            : "bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-indigo-200 ring-1 ring-indigo-400/20"
        }`}
      >
        <CalendarDays className="size-5" />
      </span>
      <span
        className={`text-xl font-bold tracking-tight ${inverse ? "text-white" : "text-slate-950"}`}
      >
        Roomly
      </span>
    </div>
  );
}
