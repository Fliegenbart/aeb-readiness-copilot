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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  item.active
                    ? "bg-slate-950 font-semibold text-white shadow-sm"
                    : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            ))}
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
