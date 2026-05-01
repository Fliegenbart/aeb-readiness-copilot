import { ArrowRight, ClipboardCheck, FileSearch, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { HeroCapsuleAnimation } from "@/components/HeroCapsuleAnimation";

const workflowHighlights = [
  {
    icon: FileSearch,
    title: "Evidence Capsules",
    body: "Collect invoice, packing list, ERP and supplier evidence into one structured view.",
  },
  {
    icon: ClipboardCheck,
    title: "Readiness checks",
    body: "Find missing fields, contradictions and blockers before broker handover.",
  },
  {
    icon: ShieldCheck,
    title: "AEB-ready preview",
    body: "Create an AEB-compatible payload preview through a mock AEB adapter.",
  },
];

export default function Home() {
  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-7xl flex-col px-5 py-7">
        <section className="surface-in signal-sweep relative grid flex-1 overflow-hidden rounded-2xl bg-slate-950 text-white shadow-xl shadow-slate-300/40 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="absolute inset-0 data-plane opacity-80" />
          <div className="absolute bottom-0 left-0 h-1 w-3/4 bg-gradient-to-r from-teal-300 via-amber-200 to-transparent opacity-80" />

          <div className="relative max-w-3xl px-6 py-12 sm:px-9 lg:py-16">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">
              AEB-ready data preparation
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-white sm:text-6xl">
              AEB Readiness Copilot
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Turn messy trade documents and ERP extracts into structured
              Evidence Capsules, readiness scores and remediation tasks before
              handoff into an AEB-adjacent workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-md bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-teal-200"
              >
                Open demo
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link
                href="/pitch"
                className="inline-flex items-center rounded-md border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Start pitch flow
              </Link>
            </div>
          </div>

          <div className="relative flex items-end px-6 pb-8 sm:px-9 lg:py-12">
            <HeroCapsuleAnimation />
          </div>
        </section>

        <section className="mt-5 grid gap-4 pb-8 sm:grid-cols-3">
          {workflowHighlights.map((item) => (
            <article
              key={item.title}
              className="group rounded-xl border border-slate-200/80 bg-white/85 p-5 shadow-sm shadow-slate-200/40 backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:shadow-lg hover:shadow-slate-300/40"
            >
              <item.icon
                aria-hidden="true"
                className="text-teal-700 transition group-hover:text-slate-950"
                size={22}
              />
              <h2 className="mt-4 text-base font-semibold text-slate-950">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
