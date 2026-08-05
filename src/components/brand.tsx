import { CalendarDays } from "lucide-react";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-10 place-items-center rounded-xl ${
          inverse ? "bg-white/15 text-white" : "bg-indigo-600 text-white"
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
