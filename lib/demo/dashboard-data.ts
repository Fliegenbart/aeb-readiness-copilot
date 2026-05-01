import type {
  AebTarget,
  CapsuleStatus,
  RemediationTaskStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type DemoDashboardFilters = {
  status?: CapsuleStatus;
  target?: AebTarget;
  destinationCountry?: string;
};

export type DemoDashboardCapsule = Awaited<
  ReturnType<typeof getDemoDashboardData>
>["capsules"][number];

const ACTIVE_TASK_STATUSES: RemediationTaskStatus[] = ["open", "inProgress"];

export async function getDemoDashboardData(filters: DemoDashboardFilters) {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.destinationCountry
      ? { destinationCountry: filters.destinationCountry }
      : {}),
    ...(filters.target
      ? {
          readinessChecks: {
            some: {
              target: filters.target,
            },
          },
        }
      : {}),
  };

  const [capsules, allCapsules, destinationRows] = await Promise.all([
    prisma.evidenceCapsule.findMany({
      where,
      include: {
        auditEvents: { orderBy: { createdAt: "desc" } },
        contradictions: true,
        missingEvidence: true,
        readinessChecks: true,
        remediationTasks: true,
      },
      orderBy: [{ updatedAt: "desc" }, { capsuleNumber: "asc" }],
    }),
    prisma.evidenceCapsule.findMany({
      include: {
        contradictions: true,
        readinessChecks: true,
        remediationTasks: true,
      },
    }),
    prisma.evidenceCapsule.findMany({
      distinct: ["destinationCountry"],
      orderBy: { destinationCountry: "asc" },
      select: { destinationCountry: true },
    }),
  ]);

  return {
    capsules: [...capsules].sort(
      (left, right) =>
        latestAuditEventDate(right).getTime() -
          latestAuditEventDate(left).getTime() ||
        left.capsuleNumber.localeCompare(right.capsuleNumber),
    ),
    destinationCountries: destinationRows
      .map((row) => row.destinationCountry)
      .filter((country) => country && country !== "Unknown"),
    kpis: {
      evidenceCapsules: allCapsules.length,
      readyForAebHandover: allCapsules.filter((capsule) =>
        capsule.readinessChecks.some(
          (check) =>
            check.target === "CUSTOMS_BROKER_INTEGRATION" &&
            check.status === "ready",
        ),
      ).length,
      blockedCapsules: allCapsules.filter(
        (capsule) => capsule.status === "blocked",
      ).length,
      openRemediationTasks: allCapsules.reduce(
        (count, capsule) =>
          count +
          capsule.remediationTasks.filter((task) =>
            ACTIVE_TASK_STATUSES.includes(task.status),
          ).length,
        0,
      ),
      contradictionsFound: allCapsules.reduce(
        (count, capsule) => count + capsule.contradictions.length,
        0,
      ),
    },
  };
}

function latestAuditEventDate(
  capsule: { auditEvents?: Array<{ createdAt: Date }>; updatedAt: Date },
) {
  return capsule.auditEvents?.[0]?.createdAt ?? capsule.updatedAt;
}

export async function getCapsuleDetail(id: string) {
  return prisma.evidenceCapsule.findUnique({
    where: { id },
    include: {
      auditEvents: { orderBy: { createdAt: "desc" } },
      contradictions: true,
      extractedFields: {
        include: { sourceDocument: true },
        orderBy: { createdAt: "desc" },
      },
      missingEvidence: true,
      readinessChecks: true,
      remediationTasks: { orderBy: { createdAt: "desc" } },
      sourceDocuments: { orderBy: { uploadedAt: "desc" } },
    },
  });
}
