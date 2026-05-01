import type { AebTarget, CapsuleStatus, ReadinessStatus } from "@prisma/client";
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
import { buildAebPayloadPreview } from "@/lib/aeb";
import { getCapsuleDetail } from "@/lib/demo/dashboard-data";
import type { EvidenceCapsuleWithRelations } from "@/lib/domain/types";
import { generateEmailDraftForTask } from "@/lib/remediation/email-drafts";
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

const AEB_TARGETS: AebTarget[] = [
  "CUSTOMS_BROKER_INTEGRATION",
  "CUSTOMS_MANAGEMENT",
  "PRODUCT_CLASSIFICATION",
  "EXPORT_CONTROLS",
  "COMPLIANCE_SCREENING",
  "LICENSE_MANAGEMENT",
  "RISK_ASSESSMENT",
  "CARRIER_CONNECT",
];

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
                Run readiness check
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
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:min-w-56">
              <StatusBadge status={capsule.status} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Overall score
                </p>
                <p className="mt-1 text-4xl font-semibold text-slate-950">
                  {capsule.overallReadinessScore}%
                </p>
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
                {AEB_TARGETS.map((target) => {
                  const check = capsule.readinessChecks.find(
                    (item) => item.target === target,
                  );

                  const isNotApplicable =
                    !check || check.status === "notApplicable";

                  return (
                    <tr
                      key={target}
                      className={isNotApplicable ? "opacity-60" : undefined}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-950">
                        {formatTarget(target)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={check?.status ?? "notApplicable"} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {isNotApplicable ? "—" : `${check.score}%`}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {check?.summary ??
                          "Run a readiness check to populate this row."}
                      </td>
                      <td className="px-4 py-3">
                        {check && check.status !== "notApplicable" ? (
                          <Link
                            href={`/capsules/${capsule.id}/payloads/${target}`}
                            className="text-sm font-semibold text-teal-700 hover:text-teal-900"
                          >
                            View payload preview
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">
                            n/a
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
            <IssueList capsule={capsule} />
          </Section>

          <Section title="Remediation Tasks" icon={RefreshCw}>
            <RemediationTaskList capsule={capsule} />
          </Section>
        </section>

        <Section title="Evidence Map" icon={FileText}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Field</th>
                  <th className="px-4 py-3 font-semibold">Value</th>
                  <th className="px-4 py-3 font-semibold">Source document</th>
                  <th className="px-4 py-3 font-semibold">Confidence</th>
                  <th className="px-4 py-3 font-semibold">Source reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {capsule.extractedFields.map((field) => (
                  <tr key={field.id}>
                    <td className="px-4 py-3 font-semibold text-slate-950">
                      {field.label}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{field.value}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {field.sourceDocument?.filename ?? "Capsule context"}
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
                        {formatDate(document.uploadedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Audit Timeline" icon={FileText}>
            <div className="divide-y divide-slate-200">
              {buildTimeline(capsule).map((event) => (
                <div key={event.key} className="p-5">
                  <p className="font-semibold text-slate-950">{event.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {event.message}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">
                    {formatDate(event.date)}
                  </p>
                </div>
              ))}
            </div>
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

function IssueList({
  capsule,
}: {
  capsule: NonNullable<Awaited<ReturnType<typeof getCapsuleDetail>>>;
}) {
  const issues = [
    ...capsule.missingEvidence.map((item) => ({
      id: item.id,
      type: "Missing evidence",
      label: item.label,
      severity: item.severity,
      detail: `Required for ${formatTarget(item.requiredForTarget)}`,
      action: item.suggestedAction,
    })),
    ...capsule.contradictions.map((item) => ({
      id: item.id,
      type: "Contradiction",
      label: item.description,
      severity: item.severity,
      detail: `${item.leftSource}: ${item.leftValue} / ${item.rightSource}: ${item.rightValue}`,
      action: "Reconcile the conflicting source values before handover.",
    })),
    ...readinessReasonIssues(capsule),
  ].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));

  if (issues.length === 0) {
    return (
      <div className="p-5 text-sm leading-6 text-slate-600">
        No blocking issues found. The capsule currently has no stored
        contradictions, missing evidence or blocking readiness reasons.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {issues.map((issue) => (
        <div key={issue.id} className="p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                {issue.type}
              </p>
              <p className="mt-1 font-semibold text-slate-950">{issue.label}</p>
            </div>
            <SeverityBadge severity={issue.severity} />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{issue.detail}</p>
          <p className="mt-2 text-sm font-medium text-slate-800">
            Suggested action: {issue.action}
          </p>
        </div>
      ))}
    </div>
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
                    Next action:
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
              {task.dueDate ? <span>Due: {formatDate(task.dueDate)}</span> : null}
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
                    Mark resolved
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

function readinessReasonIssues(
  capsule: NonNullable<Awaited<ReturnType<typeof getCapsuleDetail>>>,
) {
  const seen = new Set<string>();

  return capsule.readinessChecks.flatMap((check) =>
    getReadinessReasons(check.details)
      .filter((reason) => reason.severity !== "info")
      .flatMap((reason) => {
        const key = `${check.target}:${reason.code}:${reason.severity}`;

        if (seen.has(key)) {
          return [];
        }

        seen.add(key);

        return [
          {
            id: key,
            type: "Readiness reason",
            label: reason.code,
            severity: reason.severity,
            detail: `${formatTarget(check.target)}: ${reason.message}`,
            action:
              "Create or update the supporting evidence, then recompute readiness.",
          },
        ];
      }),
  );
}

function getReadinessReasons(details: unknown) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }

  const reasons = (details as { reasons?: unknown }).reasons;

  if (!Array.isArray(reasons)) {
    return [];
  }

  return reasons.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const reason = item as Record<string, unknown>;
    const code = typeof reason.code === "string" ? reason.code : undefined;
    const message =
      typeof reason.message === "string" ? reason.message : undefined;
    const severity =
      reason.severity === "blocking" ||
      reason.severity === "warning" ||
      reason.severity === "info"
        ? reason.severity
        : undefined;

    if (!code || !message || !severity) {
      return [];
    }

    return [{ code, message, severity }];
  });
}

function StatusBadge({ status }: { status: CapsuleStatus | ReadinessStatus | string }) {
  if (status === "notApplicable") {
    return (
      <span className="text-xs font-medium lowercase text-slate-500">n/a</span>
    );
  }

  const classes: Record<string, string> = {
    ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    blocked: "border-red-200 bg-red-50 text-red-800",
    draft: "border-slate-200 bg-slate-50 text-slate-700",
    analyzing: "border-blue-200 bg-blue-50 text-blue-800",
    open: "border-slate-200 bg-slate-50 text-slate-800",
    inProgress: "border-blue-200 bg-blue-50 text-blue-800",
    resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dismissed: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-semibold ${classes[status] ?? classes.draft}`}
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
      className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-semibold ${classes[severity]}`}
    >
      {formatStatus(severity)}
    </span>
  );
}

function buildTimeline(
  capsule: NonNullable<Awaited<ReturnType<typeof getCapsuleDetail>>>,
) {
  const latestReadinessEvent = capsule.auditEvents.find(
    (event) => event.eventType === "readiness.computed",
  );
  const latestTaskEvent = capsule.auditEvents.find(
    (event) => event.eventType === "tasks.created",
  );
  const latestDocsEvent = capsule.auditEvents.find(
    (event) => event.eventType === "documents.analyzed",
  );

  return [
    {
      key: "created",
      title: "Created",
      message: `Capsule created for ${capsule.customerName}.`,
      date: capsule.createdAt,
    },
    {
      key: "documents",
      title: "Documents analyzed",
      message:
        latestDocsEvent?.message ??
        `${capsule.sourceDocuments.length} source documents attached for analysis.`,
      date: latestDocsEvent?.createdAt ?? latestDocumentDate(capsule),
    },
    {
      key: "readiness",
      title: "Readiness computed",
      message:
        latestReadinessEvent?.message ??
        `${capsule.readinessChecks.length} readiness checks are stored.`,
      date: latestReadinessEvent?.createdAt ?? capsule.updatedAt,
    },
    {
      key: "tasks",
      title: "Tasks created",
      message:
        latestTaskEvent?.message ??
        `${capsule.remediationTasks.length} remediation tasks are stored.`,
      date: latestTaskEvent?.createdAt ?? capsule.updatedAt,
    },
    ...capsule.auditEvents.slice(0, 4).map((event) => ({
      key: event.id,
      title: formatStatus(event.eventType),
      message: event.message,
      date: event.createdAt,
    })),
  ];
}

function latestDocumentDate(
  capsule: NonNullable<Awaited<ReturnType<typeof getCapsuleDetail>>>,
) {
  return capsule.sourceDocuments.reduce(
    (latest, document) =>
      document.uploadedAt > latest ? document.uploadedAt : latest,
    capsule.createdAt,
  );
}

function createPayloadPreview(
  capsule: NonNullable<Awaited<ReturnType<typeof getCapsuleDetail>>>,
  target: AebTarget,
) {
  return buildAebPayloadPreview(capsule as EvidenceCapsuleWithRelations, target);
}

function parsePayloadTarget(value: string): AebTarget | undefined {
  return AEB_TARGETS.includes(value as AebTarget)
    ? (value as AebTarget)
    : undefined;
}

function single(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function severityRank(severity: string): number {
  if (severity === "blocking") {
    return 3;
  }

  if (severity === "warning") {
    return 2;
  }

  return 1;
}

function formatStatus(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTarget(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
