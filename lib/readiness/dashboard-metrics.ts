import type { EvidenceCapsule } from "@/lib/domain/types";

export type DashboardMetrics = {
  totalEvidenceCapsules: number;
  readyForBrokerHandover: number;
  blockedByMissingEvidence: number;
  dataContradictions: number;
};

export function calculateDashboardMetrics(
  capsules: EvidenceCapsule[],
): DashboardMetrics {
  return {
    totalEvidenceCapsules: capsules.length,
    readyForBrokerHandover: capsules.filter(
      (capsule) => capsule.status === "AEB_READY",
    ).length,
    blockedByMissingEvidence: capsules.filter(
      (capsule) => capsule.missingEvidence.length > 0,
    ).length,
    dataContradictions: capsules.reduce(
      (count, capsule) => count + capsule.contradictions.length,
      0,
    ),
  };
}
