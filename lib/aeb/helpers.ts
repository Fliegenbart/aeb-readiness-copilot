import type {
  AebTarget,
  Contradiction,
  EvidenceCapsuleWithRelations,
  EvidenceGapSeverity,
  ExtractedField,
  JsonObject,
  MissingEvidence,
  ReadinessStatus,
  SourceDocument,
} from "@/lib/domain/types";
import type {
  AebPayloadPreview,
  PayloadIssue,
  PayloadValidationResult,
  SourceFieldRef,
} from "@/lib/aeb/types";

export type PayloadRequirement = {
  code: string;
  message: string;
  severity: "warning" | "blocking";
  path?: string;
  anyOf?: string[];
  fieldKey?: string;
};

export const AEB_TARGETS: AebTarget[] = [
  "CUSTOMS_BROKER_INTEGRATION",
  "CUSTOMS_MANAGEMENT",
  "PRODUCT_CLASSIFICATION",
  "EXPORT_CONTROLS",
  "COMPLIANCE_SCREENING",
  "LICENSE_MANAGEMENT",
  "RISK_ASSESSMENT",
  "CARRIER_CONNECT",
];

export function isAebTarget(value: string): value is AebTarget {
  return AEB_TARGETS.includes(value as AebTarget);
}

export function fieldValue(
  capsule: EvidenceCapsuleWithRelations,
  fieldKeys: string[],
  fallback?: string,
): string | undefined {
  for (const key of fieldKeys) {
    const match = capsule.extractedFields.find(
      (field) => normalizeKey(field.fieldKey) === normalizeKey(key),
    );

    if (isPresent(match?.normalizedValue ?? match?.value)) {
      return String(match?.normalizedValue ?? match?.value);
    }
  }

  return isPresent(fallback) ? fallback : undefined;
}

export function firstField(
  capsule: EvidenceCapsuleWithRelations,
  fieldKeys: string[],
): ExtractedField | undefined {
  return capsule.extractedFields.find((field) =>
    fieldKeys.some((key) => normalizeKey(field.fieldKey) === normalizeKey(key)),
  );
}

export function documentByType(
  capsule: EvidenceCapsuleWithRelations,
  type: SourceDocument["type"],
) {
  const document = capsule.sourceDocuments.find((item) => item.type === type);

  return document ? summarizeDocument(document) : undefined;
}

export function summarizeDocument(document: SourceDocument) {
  return {
    id: document.id,
    type: document.type,
    filename: document.filename,
    uploadedAt: document.uploadedAt.toISOString(),
    mockPath: document.mockPath,
  };
}

export function allDocuments(capsule: EvidenceCapsuleWithRelations) {
  return capsule.sourceDocuments.map(summarizeDocument);
}

export function evidenceGapsForTarget(
  capsule: EvidenceCapsuleWithRelations,
  target: AebTarget,
) {
  return {
    missingEvidence: capsule.missingEvidence
      .filter((item) => item.requiredForTarget === target)
      .map((item) => ({
        evidenceKey: item.evidenceKey,
        label: item.label,
        severity: item.severity,
        suggestedAction: item.suggestedAction,
      })),
    contradictions: capsule.contradictions.map((item) => ({
      fieldKey: item.fieldKey,
      severity: item.severity,
      description: item.description,
      leftSource: item.leftSource,
      leftValue: item.leftValue,
      rightSource: item.rightSource,
      rightValue: item.rightValue,
    })),
  };
}

export function sourceFieldRefs(
  capsule: EvidenceCapsuleWithRelations,
  fieldKeys: string[],
): SourceFieldRef[] {
  const wantedKeys = new Set(fieldKeys.map(normalizeKey));
  const documentsById = new Map(
    capsule.sourceDocuments.map((document) => [document.id, document]),
  );

  return capsule.extractedFields
    .filter((field) => wantedKeys.has(normalizeKey(field.fieldKey)))
    .map((field) => {
      const sourceDocument = field.sourceDocumentId
        ? documentsById.get(field.sourceDocumentId)
        : undefined;

      return {
        fieldKey: field.fieldKey,
        label: field.label,
        value: field.value,
        normalizedValue: field.normalizedValue,
        confidence: field.confidence,
        sourceRef: field.sourceRef,
        sourceDocumentId: field.sourceDocumentId,
        sourceDocumentFilename: sourceDocument?.filename,
      };
    });
}

export function resolveReadinessStatus(
  capsule: EvidenceCapsuleWithRelations,
  target: AebTarget,
  validation: PayloadValidationResult,
): ReadinessStatus {
  const storedCheck = capsule.readinessChecks.find(
    (check) => check.target === target,
  );

  if (validation.blockingIssues.length > 0) {
    return "blocked";
  }

  if (validation.warnings.length > 0) {
    return "warning";
  }

  return storedCheck?.status ?? "ready";
}

export function validateRequirements(
  preview: AebPayloadPreview,
  requirements: PayloadRequirement[],
): PayloadValidationResult {
  const warnings: PayloadIssue[] = [];
  const blockingIssues: PayloadIssue[] = [];

  for (const requirement of requirements) {
    const value = requirement.anyOf
      ? firstPresentPath(preview.payload, requirement.anyOf)
      : getPath(preview.payload, requirement.path ?? "");

    if (isPresent(value)) {
      continue;
    }

    const issue = issueFromRequirement(preview, requirement);

    if (requirement.severity === "blocking") {
      blockingIssues.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  const evidenceGapIssues = evidenceGapIssuesFromPayload(preview.payload);
  warnings.push(...evidenceGapIssues.warnings);
  blockingIssues.push(...evidenceGapIssues.blockingIssues);

  return {
    valid: blockingIssues.length === 0,
    warnings: dedupeIssues(warnings),
    blockingIssues: dedupeIssues(blockingIssues),
  };
}

export function buildBasePreview({
  capsule,
  target,
  payload,
  sourceKeys,
}: {
  capsule: EvidenceCapsuleWithRelations;
  target: AebTarget;
  payload: JsonObject;
  sourceKeys: string[];
}): AebPayloadPreview {
  return {
    target,
    generatedAt: new Date().toISOString(),
    capsuleId: capsule.id,
    readinessStatus: "warning",
    payload,
    warnings: [],
    blockingIssues: [],
    sourceFieldRefs: sourceFieldRefs(capsule, sourceKeys),
  };
}

export function attachValidation(
  capsule: EvidenceCapsuleWithRelations,
  preview: AebPayloadPreview,
  validation: PayloadValidationResult,
): AebPayloadPreview {
  return {
    ...preview,
    readinessStatus: resolveReadinessStatus(
      capsule,
      preview.target,
      validation,
    ),
    warnings: validation.warnings,
    blockingIssues: validation.blockingIssues,
  };
}

function evidenceGapIssuesFromPayload(payload: JsonObject) {
  const evidenceGaps = payload.evidenceGaps;

  if (
    !evidenceGaps ||
    typeof evidenceGaps !== "object" ||
    Array.isArray(evidenceGaps)
  ) {
    return { warnings: [], blockingIssues: [] };
  }

  const gaps = evidenceGaps as {
    missingEvidence?: Array<Partial<MissingEvidence>>;
    contradictions?: Array<Partial<Contradiction>>;
  };
  const warnings: PayloadIssue[] = [];
  const blockingIssues: PayloadIssue[] = [];

  for (const item of gaps.missingEvidence ?? []) {
    const issue = {
      code: `MISSING_EVIDENCE_${String(item.evidenceKey ?? "UNKNOWN").toUpperCase()}`,
      message: `${item.label ?? "Evidence"} is missing. ${item.suggestedAction ?? ""}`.trim(),
      fieldKey: item.evidenceKey,
    };

    pushSeverityIssue(item.severity, issue, warnings, blockingIssues);
  }

  for (const item of gaps.contradictions ?? []) {
    const issue = {
      code: `CONTRADICTION_${String(item.fieldKey ?? "UNKNOWN").toUpperCase()}`,
      message: item.description ?? "Contradicting source evidence exists.",
      fieldKey: item.fieldKey,
      sourceRef: item.leftSource,
    };

    pushSeverityIssue(item.severity, issue, warnings, blockingIssues);
  }

  return { warnings, blockingIssues };
}

function pushSeverityIssue(
  severity: EvidenceGapSeverity | undefined,
  issue: PayloadIssue,
  warnings: PayloadIssue[],
  blockingIssues: PayloadIssue[],
) {
  if (severity === "blocking") {
    blockingIssues.push(issue);
    return;
  }

  if (severity === "warning") {
    warnings.push(issue);
  }
}

function issueFromRequirement(
  preview: AebPayloadPreview,
  requirement: PayloadRequirement,
): PayloadIssue {
  const sourceRef = requirement.fieldKey
    ? preview.sourceFieldRefs.find(
        (ref) => normalizeKey(ref.fieldKey) === normalizeKey(requirement.fieldKey ?? ""),
      )?.sourceRef
    : undefined;

  return {
    code: requirement.code,
    message: requirement.message,
    fieldKey: requirement.fieldKey,
    sourceRef,
  };
}

function firstPresentPath(payload: JsonObject, paths: string[]) {
  for (const path of paths) {
    const value = getPath(payload, path);

    if (isPresent(value)) {
      return value;
    }
  }

  return undefined;
}

function getPath(payload: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce((current: unknown, segment) => {
    if (current === undefined || current === null) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      return Number.isInteger(index) ? current[index] : undefined;
    }

    if (typeof current === "object") {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, payload);
}

function isPresent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && normalized !== "unknown";
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

function dedupeIssues(issues: PayloadIssue[]) {
  const seen = new Set<string>();

  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.fieldKey ?? ""}:${issue.message}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}
