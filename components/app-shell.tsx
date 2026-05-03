"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const GLOBAL_DEMO_DISCLAIMER =
  "Prototype only. Not legal, customs, sanctions or export-control advice.";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Home", active: pathname === "/" },
    { href: "/demo", label: "Demo", active: pathname.startsWith("/demo") },
    { href: "/pitch", label: "Pitch", active: pathname.startsWith("/pitch") },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[rgba(251,250,247,0.76)] backdrop-blur-2xl">
        <nav className="mx-auto flex h-[4.5rem] w-full max-w-7xl items-center justify-between px-5 py-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-sm font-semibold text-slate-950"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white shadow-lg shadow-slate-300/40 transition group-hover:bg-teal-800">
              AR
            </span>
            <span className="flex flex-col">
              <span>AEB Readiness Copilot</span>
              <span className="text-[11px] font-medium text-slate-500">
                Evidence-first readiness demo
              </span>
            </span>
          </Link>
          <div className="premium-panel flex items-center rounded-full p-1.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  item.active
                    ? "bg-slate-950 font-semibold text-white shadow-sm shadow-slate-300/30"
                    : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-amber-200/70 bg-amber-50/70 backdrop-blur">
          <p className="mx-auto w-full max-w-7xl px-5 py-1.5 text-xs font-medium text-amber-950">
            {GLOBAL_DEMO_DISCLAIMER}
          </p>
        </div>
      </header>
      {children}
    </div>
  );
}
