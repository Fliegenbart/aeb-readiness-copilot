import type { EvidenceCapsuleWithRelations } from "@/lib/domain/types";

export type DashboardMetrics = {
  totalEvidenceCapsules: number;
  readyForBrokerHandover: number;
  blockedByMissingEvidence: number;
  dataContradictions: number;
};

export function calculateDashboardMetrics(
  capsules: EvidenceCapsuleWithRelations[],
): DashboardMetrics {
  return {
    totalEvidenceCapsules: capsules.length,
    readyForBrokerHandover: capsules.filter((capsule) =>
      capsule.readinessChecks.some(
        (check) =>
          check.target === "CUSTOMS_BROKER_INTEGRATION" &&
          check.status === "ready",
      ),
    ).length,
    blockedByMissingEvidence: capsules.filter(
      (capsule) =>
        capsule.missingEvidence.some(
          (missingEvidence) => missingEvidence.severity === "blocking",
        ),
    ).length,
    dataContradictions: capsules.reduce(
      (count, capsule) => count + capsule.contradictions.length,
      0,
    ),
  };
}
