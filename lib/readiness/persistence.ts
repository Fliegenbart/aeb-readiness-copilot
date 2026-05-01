import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  EvidenceCapsuleWithRelations,
} from "@/lib/domain/types";
import {
  computeReadiness,
  deriveRemediationTasks,
  type ReadinessResult,
} from "@/lib/readiness/engine";
import {
  MANAGED_MISSING_EVIDENCE_KEYS,
  compareExtractedFieldContradictions,
  managedContradictionFieldKeys,
  type ContradictionDraft,
  type MissingEvidenceDraft,
} from "@/lib/readiness/contradictions";

export async function recomputeStoredReadiness(
  prisma: PrismaClient,
  capsuleId: string,
  actor = "readiness.engine",
): Promise<ReadinessResult | null> {
  const capsule = await prisma.evidenceCapsule.findUnique({
    where: { id: capsuleId },
    include: {
      auditEvents: true,
      contradictions: true,
      extractedFields: true,
      missingEvidence: true,
      readinessChecks: true,
      remediationTasks: true,
      sourceDocuments: true,
    },
  });

  if (!capsule) {
    return null;
  }

  const domainCapsule = toDomainCapsule(capsule);
  const derivedIssues = compareExtractedFieldContradictions(domainCapsule);
  const managedContradictionFields = managedContradictionFieldKeys();
  const managedMissingEvidenceKeys = [...MANAGED_MISSING_EVIDENCE_KEYS];
  const capsuleWithDerivedIssues: EvidenceCapsuleWithRelations = {
    ...domainCapsule,
    contradictions: [
      ...domainCapsule.contradictions.filter(
        (item) => !managedContradictionFields.includes(item.fieldKey),
      ),
      ...derivedIssues.contradictions.map((item, index) =>
        toDomainContradiction(capsuleId, item, index),
      ),
    ],
    missingEvidence: [
      ...domainCapsule.missingEvidence.filter(
        (item) => !managedMissingEvidenceKeys.includes(item.evidenceKey),
      ),
      ...derivedIssues.missingEvidence.map((item, index) =>
        toDomainMissingEvidence(capsuleId, item, index),
      ),
    ],
  };
  const result = computeReadiness(capsuleWithDerivedIssues);
  const tasks = deriveRemediationTasks(result);
  const activeTaskStatuses = ["open", "inProgress"] as const;
  const activeReasonCodes = tasks.map((task) => task.reasonCode);
  const existingActiveTasksByReason = new Map(
    capsule.remediationTasks
      .filter(
        (task) =>
          task.reasonCode &&
          activeTaskStatuses.includes(task.status as (typeof activeTaskStatuses)[number]),
      )
      .map((task) => [task.reasonCode, task]),
  );

  const transaction: Prisma.PrismaPromise<unknown>[] = [
    prisma.evidenceCapsule.update({
      where: { id: capsuleId },
      data: {
        status: result.capsuleStatus,
        overallReadinessScore: result.overallReadinessScore,
      },
    }),
    prisma.contradiction.deleteMany({
      where: {
        capsuleId,
        fieldKey: { in: managedContradictionFields },
      },
    }),
    prisma.missingEvidence.deleteMany({
      where: {
        capsuleId,
        evidenceKey: { in: managedMissingEvidenceKeys },
      },
    }),
    prisma.readinessCheck.deleteMany({ where: { capsuleId } }),
  ];

  transaction.push(
    prisma.remediationTask.deleteMany({
      where: {
        capsuleId,
        status: { in: [...activeTaskStatuses] },
        OR:
          activeReasonCodes.length > 0
            ? [
                { reasonCode: null },
                { reasonCode: { notIn: activeReasonCodes } },
              ]
            : [{ reasonCode: null }, { reasonCode: { not: null } }],
      },
    }),
  );

  if (derivedIssues.contradictions.length > 0) {
    transaction.push(
      prisma.contradiction.createMany({
        data: derivedIssues.contradictions.map((contradiction) => ({
          capsuleId,
          fieldKey: contradiction.fieldKey,
          severity: contradiction.severity,
          description: contradiction.description,
          leftSource: contradiction.leftSource,
          leftValue: contradiction.leftValue,
          rightSource: contradiction.rightSource,
          rightValue: contradiction.rightValue,
        })),
      }),
    );
  }

  if (derivedIssues.missingEvidence.length > 0) {
    transaction.push(
      prisma.missingEvidence.createMany({
        data: derivedIssues.missingEvidence.map((item) => ({
          capsuleId,
          evidenceKey: item.evidenceKey,
          label: item.label,
          severity: item.severity,
          requiredForTarget: item.requiredForTarget,
          suggestedAction: item.suggestedAction,
        })),
      }),
    );
  }

  transaction.push(
    prisma.readinessCheck.createMany({
      data: result.readinessChecks.map((check) => ({
        capsuleId,
        target: check.target,
        status: check.status,
        score: check.score,
        summary: check.summary,
        details: check.details as Prisma.InputJsonObject,
      })),
    }),
    prisma.auditEvent.createMany({
      data: [
        {
          capsuleId,
          eventType: "documents.analyzed",
          message: "Stored source documents and extracted fields analyzed.",
          actor,
          metadata: {
            sourceDocuments: capsule.sourceDocuments.length,
            extractedFields: capsule.extractedFields.length,
          },
        },
        {
          capsuleId,
          eventType: "readiness.computed",
          message:
            "Readiness checks recomputed from current stored evidence and contradiction rules.",
          actor,
          metadata: {
            overallReadinessScore: result.overallReadinessScore,
            capsuleStatus: result.capsuleStatus,
            checks: result.readinessChecks.length,
            derivedReasonCodes: derivedIssues.reasonCodes,
            derivedContradictions: derivedIssues.contradictions.length,
            derivedMissingEvidence: derivedIssues.missingEvidence.length,
          },
        },
        {
          capsuleId,
          eventType: "tasks.created",
          message: "Remediation task drafts refreshed from readiness reasons.",
          actor,
          metadata: {
            tasks: tasks.length,
          },
        },
      ],
    }),
  );

  for (const task of tasks) {
    const existingTask = existingActiveTasksByReason.get(task.reasonCode);

    if (existingTask) {
      transaction.push(
        prisma.remediationTask.update({
          where: { id: existingTask.id },
          data: {
            title: task.title,
            description: task.description,
            ownerRole: task.ownerRole,
            reasonCode: task.reasonCode,
            target: task.target,
            severity: task.severity,
            dismissedReason: null,
          },
        }),
      );
    } else {
      transaction.push(
        prisma.remediationTask.create({
          data: {
            capsuleId,
            title: task.title,
            description: task.description,
            ownerRole: task.ownerRole,
            status: task.status,
            reasonCode: task.reasonCode,
            target: task.target,
            severity: task.severity,
            dismissedReason: null,
          },
        }),
      );
    }
  }

  await prisma.$transaction(transaction);

  return result;
}

function toDomainContradiction(
  capsuleId: string,
  contradiction: ContradictionDraft,
  index: number,
) {
  return {
    id: `derived-contradiction-${index}`,
    capsuleId,
    fieldKey: contradiction.fieldKey,
    severity: contradiction.severity,
    description: contradiction.description,
    leftSource: contradiction.leftSource,
    leftValue: contradiction.leftValue,
    rightSource: contradiction.rightSource,
    rightValue: contradiction.rightValue,
  };
}

function toDomainMissingEvidence(
  capsuleId: string,
  missingEvidence: MissingEvidenceDraft,
  index: number,
) {
  return {
    id: `derived-missing-evidence-${index}`,
    capsuleId,
    evidenceKey: missingEvidence.evidenceKey,
    label: missingEvidence.label,
    severity: missingEvidence.severity,
    requiredForTarget: missingEvidence.requiredForTarget,
    suggestedAction: missingEvidence.suggestedAction,
  };
}

type StoredCapsule = Prisma.EvidenceCapsuleGetPayload<{
  include: {
    auditEvents: true;
    contradictions: true;
    extractedFields: true;
    missingEvidence: true;
    readinessChecks: true;
    remediationTasks: true;
    sourceDocuments: true;
  };
}>;

function toDomainCapsule(capsule: StoredCapsule): EvidenceCapsuleWithRelations {
  return {
    ...capsule,
    auditEvents: capsule.auditEvents.map((event) => ({
      ...event,
      metadata: objectOrEmpty(event.metadata),
    })),
    readinessChecks: capsule.readinessChecks.map((check) => ({
      ...check,
      details: objectOrEmpty(check.details),
    })),
    remediationTasks: capsule.remediationTasks,
  } as EvidenceCapsuleWithRelations;
}

function objectOrEmpty(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
