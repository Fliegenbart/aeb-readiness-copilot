import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { WorkflowTanks, type WorkflowTank } from "@/components/WorkflowTanks";

const workflowSamples: WorkflowTank[] = [
  {
    id: "customs-broker-integration",
    label: "Customs Broker Integration",
    status: "ready",
    score: 96,
  },
  {
    id: "customs-management",
    label: "Customs Management",
    status: "warning",
    score: 68,
  },
  {
    id: "product-classification",
    label: "Product Classification",
    status: "na",
  },
  {
    id: "export-controls",
    label: "Export Controls",
    status: "blocked",
    score: 41,
  },
  {
    id: "compliance-screening",
    label: "Compliance Screening",
    status: "ready",
    score: 88,
  },
  {
    id: "license-management",
    label: "License Management",
    status: "warning",
    score: 54,
  },
  {
    id: "risk-assessment",
    label: "Risk Assessment",
    status: "blocked",
    score: 35,
  },
  {
    id: "carrier-connect",
    label: "Carrier Connect",
    status: "ready",
    score: 91,
  },
];

const statusSamples: WorkflowTank[] = [
  { id: "ready", label: "Ready", status: "ready", score: 100 },
  { id: "warning", label: "Warning", status: "warning", score: 60 },
  { id: "blocked", label: "Blocked", status: "blocked", score: 20 },
  { id: "na", label: "Not applicable", status: "na" },
];

export default function WorkflowTanksDesignPage() {
  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-5 py-10">
        <Link
          className="text-sm font-semibold text-slate-600 hover:text-slate-950"
          href="/demo"
        >
          Back to demo
        </Link>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            Design sanity check
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950">
            Workflow Tanks
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Compact readiness cells for scanning eight AEB-adjacent workflows at
            once. Hover a tank to see its label, status and score.
          </p>

          <div className="mt-8 grid gap-8">
            <ExampleBlock
              description="Default medium size for dense dashboard rows."
              title="Medium"
            >
              <WorkflowTanks workflows={workflowSamples} />
            </ExampleBlock>

            <ExampleBlock
              description="Small size compresses the set for tables or KPI strips."
              title="Small"
            >
              <WorkflowTanks size="sm" workflows={workflowSamples} />
            </ExampleBlock>

            <ExampleBlock
              description="Large size adds tiny status icons and optional workflow labels."
              title="Large with labels"
            >
              <WorkflowTanks showLabels size="lg" workflows={workflowSamples} />
            </ExampleBlock>

            <ExampleBlock
              description="Ready, warning, blocked and not applicable shown side by side."
              title="State reference"
            >
              <WorkflowTanks showLabels size="lg" workflows={statusSamples} />
            </ExampleBlock>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function ExampleBlock({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t border-slate-100 pt-6 md:grid-cols-[220px_1fr] md:items-center">
      <div>
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-5 py-6">
        {children}
      </div>
    </section>
  );
}
