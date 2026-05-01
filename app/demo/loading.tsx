import { AppShell } from "@/components/app-shell";

export default function DemoLoading() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-8">
        <div className="h-24 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
        <div className="mt-6 h-96 animate-pulse rounded-lg border border-slate-200 bg-white" />
      </main>
    </AppShell>
  );
}
