import Link from "next/link";

export const GLOBAL_DEMO_DISCLAIMER =
  "Prototype only. Not legal, customs, sanctions or export-control advice.";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6">
          <Link href="/" className="text-base font-semibold text-slate-950">
            AEB Readiness Copilot
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Home
            </Link>
            <Link
              href="/demo"
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Demo
            </Link>
            <Link
              href="/pitch"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Pitch
            </Link>
          </div>
        </nav>
        <div className="border-t border-slate-100 bg-amber-50/80">
          <p className="mx-auto w-full max-w-7xl px-6 py-2 text-xs font-medium text-amber-900">
            {GLOBAL_DEMO_DISCLAIMER}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
