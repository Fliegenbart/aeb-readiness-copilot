import type { AebTarget, ReadinessStatus } from "@prisma/client";
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  CheckCircle2,
  DatabaseZap,
  FileText,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db/prisma";
import type { EvidenceCapsuleWithRelations } from "@/lib/domain/types";
import { buildPitchDemoFlow } from "@/lib/pitch/demo-flow";
import { resetPitchDemoDataAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PitchPage() {
  const capsules = (await prisma.evidenceCapsule.findMany({
    include: {
      auditEvents: true,
      contradictions: true,
      extractedFields: true,
      missingEvidence: true,
      readinessChecks: true,
      remediationTasks: true,
      sourceDocuments: true,
    },
    orderBy: { capsuleNumber: "asc" },
  })) as EvidenceCapsuleWithRelations[];
  const flow = buildPitchDemoFlow(capsules);
  const visiblePayload = {
    target: flow.payloadPreview.target,
    generatedAt: flow.payloadPreview.generatedAt,
    readinessStatus: flow.payloadPreview.readinessStatus,
    adapter: flow.payloadPreview.payload.adapter,
    payloadType: flow.payloadPreview.payload.payloadType,
    payload: flow.payloadPreview.payload,
    warnings: flow.payloadPreview.warnings,
    blockingIssues: flow.payloadPreview.blockingIssues,
    sourceFieldRefs: flow.payloadPreview.sourceFieldRefs.slice(0, 8),
  };

  return (
    <AppShell>
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              Guided partner demo
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              AEB Readiness Copilot
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              A five-step flow for AEB-ready data preparation, designed for
              AEB-adjacent workflows.
            </p>
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
              Prototype only. Not legal, customs, sanctions or export-control
              advice. Uses mock AEB adapters for AEB-adjacent workflow previews.
            </div>
            <form action={resetPitchDemoDataAction} className="mt-4">
              <button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                <RefreshCw aria-hidden="true" size={16} />
                Reset demo data
              </button>
            </form>
            <nav className="mt-5 space-y-2">
              {flow.steps.map((step, index) => (
                <a
                  key={step.id}
                  href={`#${step.id}`}
                  className="grid grid-cols-[2rem_1fr] gap-3 rounded-md border border-slate-200 px-3 py-3 text-sm transition hover:border-teal-300 hover:bg-teal-50/40"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-950">
                      {step.title}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {step.duration}
                    </span>
                  </span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="min-w-0">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                  Strategic partner walkthrough
                </p>
                <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-normal text-slate-950">
                  From messy trade intake to an AEB-ready payload preview in
                  under five minutes.
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                  {flow.positioningCopy}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 lg:min-w-72">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Demo capsule
                </p>
                <p className="mt-2 font-semibold text-slate-950">
                  {flow.primaryCapsule.capsuleNumber}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {flow.primaryCapsule.title}
                </p>
                <dl className="mt-4 grid gap-2 text-sm">
                  <Meta label="Customer" value={flow.primaryCapsule.customerName} />
                  <Meta
                    label="Destination"
                    value={flow.primaryCapsule.destinationCountry}
                  />
                  <Meta label="Incoterm" value={flow.primaryCapsule.incoterm} />
                </dl>
              </div>
            </div>
          </section>

          <PitchSection
            id="messy-intake"
            step="01"
            title="Messy intake"
            icon={FileText}
            summary="Trade data arrives as PDFs, spreadsheets, emails and ad hoc evidence files. The demo starts before anything is clean."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {flow.sourceDocuments.map((document) => (
                <div
                  key={document.type}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        {document.typeLabel}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {document.filename}
                      </p>
                    </div>
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                      {document.format}
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Mock source from {document.capsuleNumber}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
              Talk track: The value is not replacing AEB. The value is getting
              inconsistent intake into a reliable, traceable shape before an
              AEB-adjacent workflow needs it.
            </p>
          </PitchSection>

          <PitchSection
            id="evidence-capsule"
            step="02"
            title="Evidence Capsule"
            icon={DatabaseZap}
            summary="The capsule preserves where each value came from, what was normalized and how confident the extraction is."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Field</th>
                    <th className="px-4 py-3 font-semibold">Raw value</th>
                    <th className="px-4 py-3 font-semibold">Normalized</th>
                    <th className="px-4 py-3 font-semibold">Confidence</th>
                    <th className="px-4 py-3 font-semibold">Source reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {flow.normalizedFields.map((field) => (
                    <tr key={field.fieldKey}>
                      <td className="px-4 py-3 font-semibold text-slate-950">
                        {field.label}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{field.value}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {field.normalizedValue ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {Math.round(field.confidence * 100)}%
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {field.sourceRef}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PitchSection>

          <PitchSection
            id="readiness-matrix"
            step="03"
            title="Readiness Matrix"
            icon={ShieldCheck}
            summary="The same evidence can be ready for one workflow, warning for another and blocked for a third."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">AEB target workflow</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Evidence Capsule</th>
                    <th className="px-4 py-3 font-semibold">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {flow.readinessRows.map((row) => (
                    <tr key={row.target}>
                      <td className="px-4 py-3 font-semibold text-slate-950">
                        {formatTarget(row.target)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.score}%</td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.capsuleNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PitchSection>

          <PitchSection
            id="exception-resolution"
            step="04"
            title="Exception Resolution"
            icon={AlertTriangle}
            summary="The Copilot turns evidence gaps and contradictions into concrete operational follow-ups."
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <ExceptionPanel
                title="Missing evidence"
                icon={ShieldAlert}
                items={flow.exceptions.missingEvidence.slice(0, 4).map((item) => ({
                  key: item.id,
                  label: item.label,
                  detail: `${formatTarget(item.requiredForTarget)}: ${item.suggestedAction}`,
                  severity: item.severity,
                }))}
              />
              <ExceptionPanel
                title="Contradictions"
                icon={AlertTriangle}
                items={flow.exceptions.contradictions.slice(0, 4).map((item) => ({
                  key: item.id,
                  label: item.description,
                  detail: `${item.capsuleNumber}: ${item.detail}`,
                  severity: item.severity,
                }))}
              />
              <ExceptionPanel
                title="Generated tasks"
                icon={ListChecks}
                items={flow.exceptions.tasks.slice(0, 4).map((item) => ({
                  key: item.id,
                  label: item.title,
                  detail: `${formatStatus(item.ownerRole)}: ${item.description}`,
                  severity: item.severity ?? "info",
                }))}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/capsules/cap_weight_mismatch"
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open blocked capsule
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                View dashboard
              </Link>
            </div>
          </PitchSection>

          <PitchSection
            id="payload-preview"
            step="05"
            title="AEB-ready payload preview"
            icon={Braces}
            summary="The last step shows an AEB-compatible payload preview produced by a mock AEB adapter. It is not a filing and does not connect to external AEB APIs."
          >
            <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Mock adapter
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-950">
                  {formatTarget(flow.payloadPreview.target)}
                </h3>
                <dl className="mt-4 grid gap-3 text-sm">
                  <Meta
                    label="Payload type"
                    value="AEB-compatible payload preview"
                  />
                  <Meta
                    label="Readiness status"
                    value={formatStatus(flow.payloadPreview.readinessStatus)}
                  />
                  <Meta
                    label="Source refs"
                    value={`${flow.payloadPreview.sourceFieldRefs.length} fields`}
                  />
                </dl>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  This demonstrates AEB-ready data preparation only. The mock
                  AEB adapter builds a preview of what an AEB-adjacent handover
                  could consume after validation.
                </p>
              </div>
              <pre className="max-h-[560px] overflow-auto rounded-lg bg-slate-950 p-5 text-xs leading-6 text-slate-100">
                {JSON.stringify(visiblePayload, null, 2)}
              </pre>
            </div>
          </PitchSection>
        </div>
      </main>
    </AppShell>
  );
}

function PitchSection({
  id,
  step,
  title,
  icon: Icon,
  summary,
  children,
}: {
  id: string;
  step: string;
  title: string;
  icon: typeof FileText;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-sm font-semibold text-teal-800">
            {step}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <Icon aria-hidden="true" className="text-slate-500" size={18} />
              <h2 className="text-base font-semibold text-slate-950">{title}</h2>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {summary}
            </p>
          </div>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ExceptionPanel({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof AlertTriangle;
  items: Array<{
    key: string;
    label: string;
    detail: string;
    severity: string;
  }>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        <Icon aria-hidden="true" className="text-slate-500" size={16} />
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="divide-y divide-slate-200">
        {items.length === 0 ? (
          <p className="p-4 text-sm text-slate-600">No items in seeded data.</p>
        ) : (
          items.map((item) => (
            <div key={item.key} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">
                  {item.label}
                </p>
                <SeverityBadge severity={item.severity} />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.detail}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ReadinessStatus | string }) {
  const classes: Record<string, string> = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    blocked: "border-red-200 bg-red-50 text-red-800",
    notApplicable: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-semibold ${classes[status] ?? classes.notApplicable}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const classes: Record<string, string> = {
    blocking: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    info: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${classes[severity] ?? classes.info}`}
    >
      {formatStatus(severity)}
    </span>
  );
}

function formatTarget(target: AebTarget | string): string {
  return target
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatStatus(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
