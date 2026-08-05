export default function AppLoading() {
  return (
    <main className="mx-auto max-w-[1600px] animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="mt-3 h-9 w-72 rounded-lg bg-slate-200" />
      <div className="mt-8 grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="h-96 rounded-2xl bg-white shadow-sm" />
        <div className="h-[640px] rounded-2xl bg-white shadow-sm" />
      </div>
    </main>
  );
}
