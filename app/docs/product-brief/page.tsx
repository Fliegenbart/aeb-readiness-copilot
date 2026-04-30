import { AppShell } from "@/components/app-shell";

const nonGoals = [
  "No customs filing system.",
  "No sanctions screening engine.",
  "No tariff classification engine.",
  "No export-control decision engine.",
  "No claim of official AEB integration.",
];

export default function ProductBriefPage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
          Product brief
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal text-slate-950">
          AEB Readiness Copilot
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-700">
          A pitchable MVP for trade compliance and customs operations teams. It
          turns messy shipment evidence into Evidence Capsules, readiness
          checks, remediation tasks and an AEB-compatible payload preview.
        </p>

        <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">MVP focus</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            The first version uses deterministic demo data and an optional mock
            AI provider. This keeps the product reliable for strategic partner
            demos while leaving room for external AI later.
          </p>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">Non-goals</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {nonGoals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </AppShell>
  );
}
