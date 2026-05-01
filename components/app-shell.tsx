import Link from "next/link";

export const GLOBAL_DEMO_DISCLAIMER =
  "Prototype only. Not legal, customs, sanctions or export-control advice.";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[rgba(251,250,247,0.86)] backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-sm font-semibold text-slate-950"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-950 text-xs font-bold text-white shadow-sm transition group-hover:bg-teal-800">
              AR
            </span>
            <span>AEB Readiness Copilot</span>
          </Link>
          <div className="flex items-center rounded-full border border-slate-200 bg-white/70 p-1 shadow-sm">
            <Link
              href="/"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Home
            </Link>
            <Link
              href="/demo"
              className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Demo
            </Link>
            <Link
              href="/pitch"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Pitch
            </Link>
          </div>
        </nav>
        <div className="border-t border-amber-200/70 bg-amber-50/70">
          <p className="mx-auto w-full max-w-7xl px-5 py-1.5 text-xs font-medium text-amber-950">
            {GLOBAL_DEMO_DISCLAIMER}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
