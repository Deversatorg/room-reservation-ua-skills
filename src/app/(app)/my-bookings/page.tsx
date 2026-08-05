import { requirePageUser } from "@/lib/session";

export default async function MyBookingsPage() {
  await requirePageUser();

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-indigo-600">Personal schedule</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
        My bookings
      </h1>
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
        Your upcoming and past bookings will appear here.
      </div>
    </main>
  );
}
