import type { AebTarget, ReadinessStatus } from "@prisma/client";

export type WorkflowTankData = {
  id: string;
  label: string;
  status: "ready" | "warning" | "blocked" | "na";
  score?: number;
};

type ReadinessCheckLike = {
  target: AebTarget;
  status: ReadinessStatus;
  score: number;
};

export const WORKFLOW_TARGETS: AebTarget[] = [
  "CUSTOMS_BROKER_INTEGRATION",
  "CUSTOMS_MANAGEMENT",
  "PRODUCT_CLASSIFICATION",
  "EXPORT_CONTROLS",
  "COMPLIANCE_SCREENING",
  "LICENSE_MANAGEMENT",
  "RISK_ASSESSMENT",
  "CARRIER_CONNECT",
];

const WORKFLOW_LABELS: Record<AebTarget, string> = {
  CUSTOMS_BROKER_INTEGRATION: "Customs Broker Integration",
  CUSTOMS_MANAGEMENT: "Customs Management",
  PRODUCT_CLASSIFICATION: "Product Classification",
  EXPORT_CONTROLS: "Export Controls",
  COMPLIANCE_SCREENING: "Compliance Screening",
  LICENSE_MANAGEMENT: "License Management",
  RISK_ASSESSMENT: "Risk Assessment",
  CARRIER_CONNECT: "Carrier Connect",
};

export function buildWorkflowTanks(
  readinessChecks: ReadinessCheckLike[],
): WorkflowTankData[] {
  return WORKFLOW_TARGETS.map((target) => {
    const check = readinessChecks.find((item) => item.target === target);

    return {
      id: target,
      label: WORKFLOW_LABELS[target],
      status: check ? toTankStatus(check.status) : "na",
      score: check?.score,
    };
  });
}

export function workflowRowId(target: string): string {
  return `workflow-row-${target}`;
}

function toTankStatus(status: ReadinessStatus): WorkflowTankData["status"] {
  if (status === "notApplicable") {
    return "na";
  }

  return status;
}
