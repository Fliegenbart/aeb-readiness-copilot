import { AppShell } from "@/components/app-shell";

export default function CapsuleDetailLoading() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <div className="h-8 w-40 animate-pulse rounded-md bg-slate-200" />
        <div className="mt-6 h-44 animate-pulse rounded-lg border border-slate-200 bg-white" />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
          <div className="h-80 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      </main>
    </AppShell>
  );
}
