import type {
  AebTarget,
  CapsuleStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { buildAebPayloadPreview, parseAebTarget } from "@/lib/aeb";
import { AEB_TARGETS } from "@/lib/aeb/helpers";
import type { EvidenceCapsuleWithRelations } from "@/lib/domain/types";
import { recomputeStoredReadiness } from "@/lib/readiness/persistence";

export type CapsuleListFilters = {
  status?: CapsuleStatus;
  target?: AebTarget;
  destinationCountry?: string;
};

export class ApiServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

const CAPSULE_STATUSES: CapsuleStatus[] = [
  "draft",
  "analyzing",
  "blocked",
  "warning",
  "ready",
];

const SENSITIVE_PATH_KEYS = new Set([
  "mockPath",
  "storagePath",
  "localPath",
  "filePath",
  "relativePath",
  "absolutePath",
]);

export function parseCapsuleListFilters(
  searchParams: URLSearchParams,
): CapsuleListFilters {
  const status = optionalParam(searchParams, "status");
  const target = optionalParam(searchParams, "target");
  const destinationCountry = optionalParam(searchParams, "destinationCountry");

  if (status && !CAPSULE_STATUSES.includes(status as CapsuleStatus)) {
    throw new ApiServiceError(
      "INVALID_CAPSULE_STATUS",
      "Unsupported capsule status filter.",
      400,
      { allowedValues: CAPSULE_STATUSES },
    );
  }

  if (target && !AEB_TARGETS.includes(target as AebTarget)) {
    throw new ApiServiceError(
      "INVALID_AEB_TARGET",
      "Unsupported AEB target workflow.",
      400,
      { allowedValues: AEB_TARGETS },
    );
  }

  return {
    ...(status ? { status: status as CapsuleStatus } : {}),
    ...(target ? { target: target as AebTarget } : {}),
    ...(destinationCountry ? { destinationCountry } : {}),
  };
}

export async function listCapsulesForApi(
  prisma: PrismaClient,
  filters: CapsuleListFilters,
) {
  const where: Prisma.EvidenceCapsuleWhereInput = {
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

  const capsules = await prisma.evidenceCapsule.findMany({
    where,
    include: {
      contradictions: true,
      missingEvidence: true,
      readinessChecks: true,
      remediationTasks: true,
      sourceDocuments: true,
    },
    orderBy: [{ updatedAt: "desc" }, { capsuleNumber: "asc" }],
  });

  return sanitizeForApi({
    filters,
    count: capsules.length,
    capsules,
  });
}

export async function getCapsuleDetailForApi(
  prisma: PrismaClient,
  capsuleId: string,
) {
  const capsule = await fetchCapsuleDetail(prisma, capsuleId);

  if (!capsule) {
    throw capsuleNotFound();
  }

  return sanitizeForApi(capsule);
}

export async function recomputeCapsuleForApi(
  prisma: PrismaClient,
  capsuleId: string,
) {
  const result = await recomputeStoredReadiness(prisma, capsuleId, "api");

  if (!result) {
    throw capsuleNotFound();
  }

  return {
    readinessResult: sanitizeForApi(result),
    capsule: await getCapsuleDetailForApi(prisma, capsuleId),
  };
}

export async function getPayloadPreviewForApi(
  prisma: PrismaClient,
  capsuleId: string,
  target: string,
) {
  const parsedTarget = parseAebTarget(target);

  if (!parsedTarget) {
    throw new ApiServiceError(
      "INVALID_AEB_TARGET",
      "Unsupported AEB target workflow.",
      400,
      { allowedValues: AEB_TARGETS },
    );
  }

  const capsule = await fetchCapsuleDetail(prisma, capsuleId);

  if (!capsule) {
    throw capsuleNotFound();
  }

  const preview = buildAebPayloadPreview(
    capsule as EvidenceCapsuleWithRelations,
    parsedTarget,
  );

  await prisma.auditEvent.create({
    data: {
      capsuleId: capsule.id,
      eventType: "payload.preview.generated",
      message: `AEB-ready payload preview generated for ${parsedTarget}.`,
      actor: "mock-aeb-adapter",
      metadata: {
        target: parsedTarget,
        readinessStatus: preview.readinessStatus,
        warningCount: preview.warnings.length,
        blockingIssueCount: preview.blockingIssues.length,
        generatedAt: preview.generatedAt,
      } as Prisma.InputJsonObject,
    },
  });

  return sanitizeForApi(preview);
}

export function sanitizeForApi<T>(value: T): T {
  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForApi(item)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_PATH_KEYS.has(key))
      .map(([key, item]) => [key, sanitizeForApi(item)]),
  ) as T;
}

export function apiErrorBody(error: ApiServiceError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  };
}

async function fetchCapsuleDetail(prisma: PrismaClient, capsuleId: string) {
  return prisma.evidenceCapsule.findUnique({
    where: { id: capsuleId },
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

function optionalParam(
  searchParams: URLSearchParams,
  key: string,
): string | undefined {
  const value = searchParams.get(key)?.trim();

  return value ? value : undefined;
}

function capsuleNotFound() {
  return new ApiServiceError(
    "CAPSULE_NOT_FOUND",
    "Evidence Capsule not found.",
    404,
  );
}
