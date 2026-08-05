import { MapPin, Users } from "lucide-react";

import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/session";

export default async function SchedulePage() {
  await requirePageUser();
  const rooms = await db.room.findMany({ orderBy: [{ floor: "asc" }, { name: "asc" }] });

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <p className="text-sm font-semibold text-indigo-600">Workspace calendar</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Choose a meeting room
        </h1>
        <p className="mt-2 text-slate-500">
          Room availability will appear in a timezone-aware weekly view.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <article
            key={room.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{room.name}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin className="size-4" /> Floor {room.floor}
                </p>
              </div>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm font-semibold text-slate-600">
                <Users className="size-4" /> {room.capacity}
              </span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
