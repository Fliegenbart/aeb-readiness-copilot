import type { AebTarget } from "@prisma/client";
import {
  ArrowLeft,
  CircleCheck,
  CircleDot,
  FileJson,
  FileText,
  FileUp,
  type LucideIcon,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AuditTimeline } from "@/components/audit-timeline";
import { CapsuleIssues } from "@/components/capsule-issues";
import { EvidenceMap } from "@/components/EvidenceMap";
import { StatusBadge } from "@/components/status-badge";
import { WorkflowTanksNavigator } from "@/components/WorkflowTanksNavigator";
import {
  SCORE_THRESHOLD_TOOLTIP,
  clampScoreToPercent,
} from "@/config/scoreThresholds";
import { buildAebPayloadPreview } from "@/lib/aeb";
import { getCapsuleDetail } from "@/lib/demo/dashboard-data";
import type { EvidenceCapsuleWithRelations } from "@/lib/domain/types";
import {
  WORKFLOW_TARGETS,
  buildWorkflowTanks,
  workflowRowId,
} from "@/lib/readiness/workflow-tanks";
import { generateEmailDraftForTask } from "@/lib/remediation/email-drafts";
import {
  formatDateTime,
  formatStatus,
  formatTarget,
} from "@/lib/ui/format";
import {
  dismissRemediationTaskAction,
  recomputeCapsuleReadinessAction,
  updateRemediationTaskStatusAction,
} from "./actions";
import { EmailDraftButton } from "./email-draft-button";

export const dynamic = "force-dynamic";

type CapsuleDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CapsuleDetailPage({
  params,
  searchParams,
}: CapsuleDetailPageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const capsule = await getCapsuleDetail(id);

  if (!capsule) {
    notFound();
  }

  const selectedPayloadTarget = parsePayloadTarget(
    single(resolvedSearchParams?.payload),
  );
  const workflowTanks = buildWorkflowTanks(capsule.readinessChecks);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-5 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Back to dashboard
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/capsules/${capsule.id}/upload`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FileUp aria-hidden="true" size={16} />
              Upload Document
            </Link>
            <form action={recomputeCapsuleReadinessAction.bind(null, capsule.id)}>
              <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                <RefreshCw aria-hidden="true" size={16} />
                Run pre-flight check
              </button>
            </form>
          </div>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                {capsule.capsuleNumber}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                {capsule.title}
              </h1>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                <Meta label="Customer" value={capsule.customerName} />
                <Meta label="Destination" value={capsule.destinationCountry} />
                <Meta label="Incoterm" value={capsule.incoterm} />
              </dl>
              <div className="mt-6 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Readiness across workflows
                </p>
                <div className="mt-3 overflow-x-auto pb-1">
                  <WorkflowTanksNavigator workflows={workflowTanks} />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:min-w-56">
              <StatusBadge labelStyle="aviation" status={capsule.status} />
              <div
                aria-label={`Overall score ${capsule.overallReadinessScore} percent. ${SCORE_THRESHOLD_TOOLTIP}`}
                title={SCORE_THRESHOLD_TOOLTIP}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Overall score
                </p>
                <p className="mt-1 text-4xl font-semibold text-slate-950">
                  {capsule.overallReadinessScore}%
                </p>
                <ScoreScale value={capsule.overallReadinessScore} />
              </div>
            </div>
          </div>
        </section>

        <Section title="AEB Readiness Matrix" icon={FileJson}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Target workflow</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Score</th>
                  <th className="px-4 py-3 font-semibold">Summary</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {WORKFLOW_TARGETS.map((target) => {
                  const check = capsule.readinessChecks.find(
                    (item) => item.target === target,
                  );

                  return (
                    <tr
                      key={target}
                      className="scroll-mt-28 transition-colors"
                      id={workflowRowId(target)}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-950">
                        {formatTarget(target)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          labelStyle="aviation"
                          status={check?.status ?? "notApplicable"}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {check ? `${check.score}%` : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {check?.summary ??
                          "No stored readiness check yet. Run a pre-flight check to populate this row."}
                      </td>
                      <td className="px-4 py-3">
                        {check && check.status !== "notApplicable" ? (
                          <Link
                            href={`/capsules/${capsule.id}/payloads/${target}`}
                            className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                          >
                            View handover packet
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Not applicable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Section title="Blocking Issues" icon={ShieldAlert}>
            <CapsuleIssues capsule={capsule} />
          </Section>

          <Section title="Remediation Tasks" icon={RefreshCw}>
            <RemediationTaskList capsule={capsule} />
          </Section>
        </section>

        <Section title="Evidence Map" icon={FileText}>
          <EvidenceMap
            fields={capsule.extractedFields.map((field) => ({
              id: field.id,
              fieldKey: field.fieldKey,
              label: field.label,
              value: field.value,
              confidence: field.confidence,
              sourceRef: field.sourceRef,
              sourceDocument: field.sourceDocument
                ? { filename: field.sourceDocument.filename }
                : null,
            }))}
          />
        </Section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <Section title="Source Documents" icon={FileText}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Filename</th>
                    <th className="px-4 py-3 font-semibold">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {capsule.sourceDocuments.map((document) => (
                    <tr key={document.id}>
                      <td className="px-4 py-3 font-semibold text-slate-950">
                        {formatStatus(document.type)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {document.filename}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDateTime(document.uploadedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Audit Timeline" icon={FileText}>
            <AuditTimeline
              auditEvents={capsule.auditEvents}
              fallback={{
                createdAt: capsule.createdAt,
                customerName: capsule.customerName,
              }}
            />
          </Section>
        </section>

        {selectedPayloadTarget ? (
          <Section title="Payload Preview" icon={FileJson} id="payload-preview">
            <pre className="max-h-[520px] overflow-auto bg-slate-950 p-5 text-xs leading-6 text-slate-100">
              {JSON.stringify(
                createPayloadPreview(capsule, selectedPayloadTarget),
                null,
                2,
              )}
            </pre>
          </Section>
        ) : null}
      </main>
    </AppShell>
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

function ScoreScale({ value }: { value: number }) {
  const clampedValue = clampScoreToPercent(value);

  return (
    <div aria-hidden="true" className="mt-3">
      <div className="relative h-2 overflow-visible rounded-full bg-slate-200">
        <div
          className="absolute inset-y-0 left-0 rounded-l-full bg-red-300/70"
          style={{ width: "50%" }}
        />
        <div
          className="absolute inset-y-0 left-[50%] bg-amber-300/75"
          style={{ width: "30%" }}
        />
        <div
          className="absolute inset-y-0 left-[80%] rounded-r-full bg-emerald-300/75"
          style={{ width: "20%" }}
        />
        <span
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-950 shadow-sm shadow-slate-400/50"
          style={{ left: `${clampedValue}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-400">
        <span>0</span>
        <span>50</span>
        <span>80</span>
        <span>100</span>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  id,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
        <Icon aria-hidden="true" className="text-slate-500" size={18} />
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function RemediationTaskList({
  capsule,
}: {
  capsule: NonNullable<Awaited<ReturnType<typeof getCapsuleDetail>>>;
}) {
  if (capsule.remediationTasks.length === 0) {
    return (
      <p className="p-5 text-sm text-slate-600">
        No remediation tasks. This usually means the capsule is ready or has not
        been recomputed yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {capsule.remediationTasks.map((task) => {
        const isActive = task.status === "open" || task.status === "inProgress";
        const draft = generateEmailDraftForTask(capsule, task);

        return (
          <div key={task.id} className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{task.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  <span className="font-medium text-slate-800">
                    Suggested next step:
                  </span>{" "}
                  {task.description}
                </p>
              </div>
              <StatusBadge status={task.status} />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.12em] text-slate-500">
              <span>Owner: {formatStatus(task.ownerRole)}</span>
              {task.target ? <span>Target: {formatTarget(task.target)}</span> : null}
              {task.severity ? <span>Severity: {formatStatus(task.severity)}</span> : null}
              {task.dueDate ? <span>Due: {formatDateTime(task.dueDate)}</span> : null}
            </div>

            {task.dismissedReason ? (
              <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Dismissed reason: {task.dismissedReason}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {task.status === "open" ? (
                <form
                  action={updateRemediationTaskStatusAction.bind(
                    null,
                    capsule.id,
                    task.id,
                    "inProgress",
                  )}
                >
                  <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-800 transition hover:bg-blue-100">
                    <CircleDot aria-hidden="true" size={14} />
                    Mark in progress
                  </button>
                </form>
              ) : null}

              {isActive ? (
                <form
                  action={updateRemediationTaskStatusAction.bind(
                    null,
                    capsule.id,
                    task.id,
                    "resolved",
                  )}
                >
                  <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100">
                    <CircleCheck aria-hidden="true" size={14} />
                    Sign off
                  </button>
                </form>
              ) : null}

              {isActive ? (
                <form
                  action={dismissRemediationTaskAction.bind(
                    null,
                    capsule.id,
                    task.id,
                  )}
                  className="flex min-w-0 flex-wrap items-center gap-2"
                >
                  <input
                    name="dismissedReason"
                    required
                    placeholder="Dismiss reason"
                    className="h-9 min-w-48 rounded-md border border-slate-300 px-3 text-xs text-slate-800 placeholder:text-slate-400"
                  />
                  <button className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                    <XCircle aria-hidden="true" size={14} />
                    Dismiss
                  </button>
                </form>
              ) : null}

              {draft ? <EmailDraftButton draft={draft} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function createPayloadPreview(
  capsule: NonNullable<Awaited<ReturnType<typeof getCapsuleDetail>>>,
  target: AebTarget,
) {
  return buildAebPayloadPreview(capsule as EvidenceCapsuleWithRelations, target);
}

function parsePayloadTarget(value: string): AebTarget | undefined {
  return WORKFLOW_TARGETS.includes(value as AebTarget)
    ? (value as AebTarget)
    : undefined;
}

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}
