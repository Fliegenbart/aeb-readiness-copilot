import { SeverityBadge } from "@/components/status-badge";
import { formatTarget } from "@/lib/ui/format";

type IssueSeverity = "info" | "warning" | "blocking";

type CapsuleIssuesProps = {
  capsule: {
    missingEvidence: Array<{
      id: string;
      label: string;
      severity: IssueSeverity;
      requiredForTarget: string;
      suggestedAction: string;
    }>;
    contradictions: Array<{
      id: string;
      description: string;
      severity: IssueSeverity;
      leftSource: string;
      leftValue: string;
      rightSource: string;
      rightValue: string;
    }>;
    readinessChecks: Array<{
      target: string;
      details: unknown;
    }>;
  };
};

type DisplayIssue = {
  id: string;
  type: string;
  label: string;
  severity: IssueSeverity;
  detail: string;
  action: string;
};

type ReadinessReason = {
  code: string;
  message: string;
  severity: IssueSeverity;
};

export function CapsuleIssues({ capsule }: CapsuleIssuesProps) {
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

function readinessReasonIssues(
  capsule: CapsuleIssuesProps["capsule"],
): DisplayIssue[] {
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

function getReadinessReasons(details: unknown): ReadinessReason[] {
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

function severityRank(severity: string): number {
  if (severity === "blocking") {
    return 3;
  }

  if (severity === "warning") {
    return 2;
  }

  return 1;
}
