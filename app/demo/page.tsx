import type { AebTarget, CapsuleStatus } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Database,
  FileWarning,
  Filter,
  ListChecks,
} from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { DashboardCard } from "@/components/dashboard-card";
import { StatusBadge } from "@/components/status-badge";
import { WorkflowTanks } from "@/components/WorkflowTanks";
import {
  SCORE_THRESHOLD_TOOLTIP,
  clampScoreToPercent,
  getScoreBand,
} from "@/config/scoreThresholds";
import {
  getDemoDashboardData,
  type DemoDashboardCapsule,
  type DemoDashboardFilters,
} from "@/lib/demo/dashboard-data";
import {
  WORKFLOW_TARGETS,
  buildWorkflowTanks,
} from "@/lib/readiness/workflow-tanks";
import { formatDateTime, formatStatus, formatTarget } from "@/lib/ui/format";

export const dynamic = "force-dynamic";

type DemoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusOptions: CapsuleStatus[] = [
  "draft",
  "analyzing",
  "blocked",
  "warning",
  "ready",
];

const targetOptions: AebTarget[] = WORKFLOW_TARGETS;

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const params = await searchParams;
  const filters = parseFilters(params ?? {});
  const data = await getDemoDashboardData(filters);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const cards = [
    {
      title: "Evidence Capsules",
      value: data.kpis.evidenceCapsules,
      detail: "Seeded readiness records",
      icon: Database,
      tone: "indigo" as const,
    },
    {
      title: "Ready for AEB Handover",
      value: data.kpis.readyForAebHandover,
      detail: "Broker handover checks are ready",
      icon: CheckCircle2,
      tone: "emerald" as const,
    },
    {
      title: "Blocked Capsules",
      value: data.kpis.blockedCapsules,
      detail: "Blocking evidence or data issues",
      icon: FileWarning,
      tone: "rose" as const,
    },
    {
      title: "Open Remediation Tasks",
      value: data.kpis.openRemediationTasks,
      detail: "Open or in-progress follow-ups",
      icon: ListChecks,
      tone: "amber" as const,
    },
    {
      title: "Contradictions Found",
      value: data.kpis.contradictionsFound,
      detail: "Conflicting source evidence",
      icon: AlertTriangle,
      tone: "teal" as const,
    },
  ];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-7">
        <section className="surface-in signal-sweep overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
          <div className="relative px-6 py-7 sm:px-8">
            <div className="absolute inset-0 data-plane opacity-95" />
            <div className="absolute bottom-0 left-0 h-1 w-2/3 bg-gradient-to-r from-teal-300 via-amber-200 to-transparent opacity-80" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">
                  Readiness operations
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                  Demo dashboard
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Evidence Capsules, AEB-ready status and operational blockers
                  from the seeded SQLite demo database.
                </p>
              </div>
              <div className="premium-panel-dark w-full max-w-sm rounded-2xl px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
                  Mock AEB adapter
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-300">
                  AEB-ready payload previews from seeded evidence.
                </p>
              </div>
            </div>
            <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
              {[
                [String(data.kpis.evidenceCapsules), "capsules in scope"],
                [String(data.kpis.openRemediationTasks), "live follow-ups"],
                [String(data.kpis.contradictionsFound), "source conflicts"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="premium-panel-dark rounded-2xl px-4 py-3"
                >
                  <p className="text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </section>

        <section className="premium-panel mt-5 rounded-2xl p-4">
          <form
            className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]"
            action="/demo"
          >
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Status
              <select
                name="status"
                defaultValue={filters.status ?? ""}
                className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:bg-white"
              >
                <option value="">All statuses</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Target workflow
              <select
                name="target"
                defaultValue={filters.target ?? ""}
                className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:bg-white"
              >
                <option value="">All target workflows</option>
                {targetOptions.map((target) => (
                  <option key={target} value={target}>
                    {formatTarget(target)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Destination country
              <select
                name="destinationCountry"
                defaultValue={filters.destinationCountry ?? ""}
                className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700 focus:bg-white"
              >
                <option value="">All destinations</option>
                {data.destinationCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </label>

            <button className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 lg:mt-auto">
              <Filter aria-hidden="true" size={16} />
              Apply
            </button>

            <Link
              href="/demo"
              className="mt-6 inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 lg:mt-auto"
            >
              Reset
            </Link>
          </form>
        </section>

        <section className="section-shell mt-5">
          <div className="section-header-band flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Evidence Capsules
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {data.capsules.length} result{data.capsules.length === 1 ? "" : "s"}
                {activeFilterCount > 0 ? ` with ${activeFilterCount} active filter${activeFilterCount === 1 ? "" : "s"}` : ""}
              </p>
            </div>
            <ClipboardList aria-hidden="true" className="text-slate-400" size={20} />
          </div>

          {data.capsules.length === 0 ? (
            <EmptyState hasFilters={activeFilterCount > 0} />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-chrome w-full min-w-[1160px] border-collapse text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Capsule</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Destination</th>
                    <th className="px-4 py-3 font-semibold">Incoterm</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Workflows</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Top blocker</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.capsules.map((capsule) => (
                    <tr key={capsule.id}>
                      <td className="px-4 py-3">
                        <Link
                          href={`/capsules/${capsule.id}`}
                          className="font-semibold text-slate-950 underline-offset-4 hover:text-teal-800 hover:underline"
                        >
                          {capsule.capsuleNumber}
                        </Link>
                        <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">
                          {capsule.title}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {capsule.customerName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {capsule.destinationCountry}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {capsule.incoterm}
                      </td>
                      <td className="px-4 py-3">
                        <Score value={capsule.overallReadinessScore} />
                      </td>
                      <td className="px-4 py-3">
                        <WorkflowTanks
                          size="sm"
                          workflows={buildWorkflowTanks(capsule.readinessChecks)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge labelStyle="aviation" status={capsule.status} />
                      </td>
                      <td className="max-w-[280px] px-4 py-3 text-slate-700">
                        {topBlocker(capsule)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(latestAuditEventDate(capsule))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="grid min-h-64 place-items-center px-6 py-12 text-center">
      <div>
        <h3 className="text-base font-semibold text-slate-950">
          No Evidence Capsules found
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
          {hasFilters
            ? "Try resetting the filters to see all seeded demo capsules."
            : "Run npm run demo:reset to seed demo Evidence Capsules."}
        </p>
        {hasFilters ? (
          <Link
            href="/demo"
            className="mt-4 inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Reset filters
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Score({ value }: { value: number }) {
  const clampedValue = clampScoreToPercent(value);

  return (
    <div
      aria-label={`Score ${value} percent. ${SCORE_THRESHOLD_TOOLTIP}`}
      className="flex items-center gap-3"
      title={SCORE_THRESHOLD_TOOLTIP}
    >
      <span className="w-10 text-sm font-semibold text-slate-950">{value}%</span>
      <div className="h-2 w-24 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${scoreColor(value)}`}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

function parseFilters(
  params: Record<string, string | string[] | undefined>,
): DemoDashboardFilters {
  const status = single(params.status);
  const target = single(params.target);
  const destinationCountry = single(params.destinationCountry);

  return {
    status: statusOptions.includes(status as CapsuleStatus)
      ? (status as CapsuleStatus)
      : undefined,
    target: targetOptions.includes(target as AebTarget)
      ? (target as AebTarget)
      : undefined,
    destinationCountry: destinationCountry || undefined,
  };
}

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function topBlocker(capsule: DemoDashboardCapsule): string {
  const blockingMissing = capsule.missingEvidence.find(
    (item) => item.severity === "blocking",
  );

  if (blockingMissing) {
    return blockingMissing.label;
  }

  const blockingContradiction = capsule.contradictions.find(
    (item) => item.severity === "blocking",
  );

  if (blockingContradiction) {
    return blockingContradiction.description;
  }

  const warningMissing = capsule.missingEvidence.find(
    (item) => item.severity === "warning",
  );

  if (warningMissing) {
    return warningMissing.label;
  }

  const warningContradiction = capsule.contradictions.find(
    (item) => item.severity === "warning",
  );

  return warningContradiction?.description ?? "None";
}

function latestAuditEventDate(capsule: DemoDashboardCapsule): Date {
  return capsule.auditEvents[0]?.createdAt ?? capsule.updatedAt;
}

function scoreColor(value: number): string {
  const band = getScoreBand(value);

  if (band === "ready") {
    return "bg-emerald-500";
  }

  if (band === "warning") {
    return "bg-amber-500";
  }

  return "bg-red-500";
}
