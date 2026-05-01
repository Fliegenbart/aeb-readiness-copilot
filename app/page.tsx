import { ArrowRight, ClipboardCheck, FileSearch, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";

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
      <main className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-6xl flex-col px-6 py-16">
        <section className="grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-normal text-slate-950 sm:text-6xl">
              AEB Readiness Copilot
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              Turn messy trade documents and ERP extracts into structured
              Evidence Capsules, readiness scores and remediation tasks before
              handoff into an AEB-adjacent workflow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
              >
                Open demo
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
              <Link
                href="/docs/product-brief"
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
              >
                Read product notes
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-200 pb-4">
              <p className="text-sm font-semibold text-slate-500">
                Mock shipment capsule
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                EU-DE-4288 / Industrial valves
              </h2>
            </div>
            <dl className="mt-5 grid gap-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Commercial invoice</dt>
                <dd className="font-semibold text-emerald-700">Matched</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Packing list</dt>
                <dd className="font-semibold text-amber-700">Needs review</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">ERP export</dt>
                <dd className="font-semibold text-emerald-700">Parsed</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">AEB-ready score</dt>
                <dd className="font-semibold text-slate-950">76%</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="grid gap-4 pb-8 sm:grid-cols-3">
          {workflowHighlights.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <item.icon aria-hidden="true" className="text-teal-700" size={22} />
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
