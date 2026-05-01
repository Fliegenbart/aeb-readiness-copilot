import type { AebPayloadPreview } from "@/lib/aeb";
import { buildAebPayloadPreview } from "@/lib/aeb";
import type {
  AebTarget,
  EvidenceCapsuleWithRelations,
  EvidenceGapSeverity,
  ExtractedField,
  MissingEvidence,
  ReadinessStatus,
  RemediationTask,
  SourceDocument,
} from "@/lib/domain/types";
import { computeReadiness } from "@/lib/readiness/engine";

export type PitchStep = {
  id: string;
  title: string;
  duration: string;
  summary: string;
};

export type PitchSourceDocument = {
  type: SourceDocument["type"];
  typeLabel: string;
  filename: string;
  capsuleNumber: string;
  format: string;
};

export type PitchField = Pick<
  ExtractedField,
  "fieldKey" | "label" | "value" | "normalizedValue" | "confidence" | "sourceRef"
> & {
  sourceDocumentFilename?: string;
};

export type PitchReadinessRow = {
  target: AebTarget;
  status: ReadinessStatus;
  score: number;
  summary: string;
  capsuleNumber: string;
  reasonCodes: string[];
};

export type PitchDemoFlow = {
  positioningCopy: string;
  primaryCapsule: {
    id: string;
    capsuleNumber: string;
    title: string;
    customerName: string;
    destinationCountry: string;
    incoterm: string;
    overallReadinessScore: number;
  };
  steps: PitchStep[];
  sourceDocuments: PitchSourceDocument[];
  normalizedFields: PitchField[];
  readinessRows: PitchReadinessRow[];
  exceptions: {
    missingEvidence: MissingEvidence[];
    contradictions: Array<{
      id: string;
      fieldKey: string;
      severity: EvidenceGapSeverity;
      description: string;
      detail: string;
      capsuleNumber: string;
    }>;
    tasks: RemediationTask[];
  };
  payloadPreview: AebPayloadPreview;
};

const REQUIRED_DOCUMENT_TYPES: SourceDocument["type"][] = [
  "commercialInvoice",
  "packingList",
  "erpExport",
  "endUseStatement",
  "technicalDatasheet",
  "brokerEmail",
];

const TARGET_ROW_PREFERENCES: Record<AebTarget, ReadinessStatus[]> = {
  CUSTOMS_BROKER_INTEGRATION: ["ready", "warning", "blocked"],
  CUSTOMS_MANAGEMENT: ["ready", "warning", "blocked"],
  PRODUCT_CLASSIFICATION: ["warning", "ready", "blocked", "notApplicable"],
  EXPORT_CONTROLS: ["blocked", "warning", "ready"],
  COMPLIANCE_SCREENING: ["warning", "ready", "blocked"],
  LICENSE_MANAGEMENT: ["warning", "ready", "blocked"],
  RISK_ASSESSMENT: ["blocked", "warning", "ready"],
  CARRIER_CONNECT: ["ready", "warning", "blocked"],
};

const FIELD_KEYS_FOR_PITCH = [
  "exporter",
  "consignee",
  "destination_country",
  "invoice_value",
  "currency",
  "gross_weight_kg",
  "net_weight_kg",
  "hs_code",
  "country_of_origin",
  "end_use",
  "technical_parameters_complete",
];

export function buildPitchDemoFlow(
  capsules: EvidenceCapsuleWithRelations[],
): PitchDemoFlow {
  if (capsules.length === 0) {
    throw new Error("Pitch demo requires seeded Evidence Capsules.");
  }

  const primaryCapsule =
    findCapsule(capsules, "cap_clean_broker_handover") ?? capsules[0];
  const payloadCapsule = primaryCapsule;
  const computedReadiness = capsules.map((capsule) => ({
    capsule,
    result: computeReadiness(capsule),
  }));

  return {
    positioningCopy:
      "AEB Readiness Copilot is designed for AEB-adjacent workflows: AEB-ready data preparation, readiness checks and mock AEB adapter payload previews before handover.",
    primaryCapsule: {
      id: primaryCapsule.id,
      capsuleNumber: primaryCapsule.capsuleNumber,
      title: primaryCapsule.title,
      customerName: primaryCapsule.customerName,
      destinationCountry: primaryCapsule.destinationCountry,
      incoterm: primaryCapsule.incoterm,
      overallReadinessScore: primaryCapsule.overallReadinessScore,
    },
    steps: [
      {
        id: "messy-intake",
        title: "Messy intake",
        duration: "45 sec",
        summary:
          "Start with invoices, packing lists, ERP exports, end-use evidence, datasheets and broker questions in inconsistent formats.",
      },
      {
        id: "evidence-capsule",
        title: "Evidence Capsule",
        duration: "60 sec",
        summary:
          "Normalize key trade fields while preserving source references and extraction confidence.",
      },
      {
        id: "readiness-matrix",
        title: "Readiness Matrix",
        duration: "60 sec",
        summary:
          "Compare readiness across AEB target workflows and separate ready, warning and blocked paths.",
      },
      {
        id: "exception-resolution",
        title: "Exception Resolution",
        duration: "60 sec",
        summary:
          "Turn missing evidence and contradictions into operational remediation tasks.",
      },
      {
        id: "payload-preview",
        title: "AEB-ready payload preview",
        duration: "45 sec",
        summary:
          "Show the mock AEB adapter output as a structured payload preview, not a real filing or API call.",
      },
    ],
    sourceDocuments: buildSourceDocuments(capsules),
    normalizedFields: buildNormalizedFields(primaryCapsule),
    readinessRows: buildReadinessRows(computedReadiness),
    exceptions: buildExceptions(capsules),
    payloadPreview: buildAebPayloadPreview(
      payloadCapsule,
      "CUSTOMS_BROKER_INTEGRATION",
    ),
  };
}

function buildSourceDocuments(
  capsules: EvidenceCapsuleWithRelations[],
): PitchSourceDocument[] {
  return REQUIRED_DOCUMENT_TYPES.flatMap((type) => {
    const match = capsules
      .flatMap((capsule) =>
        capsule.sourceDocuments.map((document) => ({ capsule, document })),
      )
      .find(({ document }) => document.type === type);

    if (!match) {
      return [];
    }

    return [
      {
        type,
        typeLabel: labelForDocumentType(type),
        filename: match.document.filename,
        capsuleNumber: match.capsule.capsuleNumber,
        format: formatFromMimeType(match.document.mimeType),
      },
    ];
  });
}

function buildNormalizedFields(
  capsule: EvidenceCapsuleWithRelations,
): PitchField[] {
  const documentsById = new Map(
    capsule.sourceDocuments.map((document) => [document.id, document]),
  );

  return FIELD_KEYS_FOR_PITCH.flatMap((fieldKey) => {
    const field = capsule.extractedFields.find(
      (item) => item.fieldKey === fieldKey,
    );

    if (!field) {
      return [];
    }

    return [
      {
        fieldKey: field.fieldKey,
        label: field.label,
        value: field.value,
        normalizedValue: field.normalizedValue,
        confidence: field.confidence,
        sourceRef: field.sourceRef,
        sourceDocumentFilename: field.sourceDocumentId
          ? documentsById.get(field.sourceDocumentId)?.filename
          : undefined,
      },
    ];
  });
}

function buildReadinessRows(
  computedReadiness: Array<{
    capsule: EvidenceCapsuleWithRelations;
    result: ReturnType<typeof computeReadiness>;
  }>,
): PitchReadinessRow[] {
  return Object.entries(TARGET_ROW_PREFERENCES).flatMap(
    ([target, statusPreferences]) => {
      for (const status of statusPreferences) {
        const match = computedReadiness
          .flatMap(({ capsule, result }) =>
            result.readinessChecks.map((check) => ({ capsule, check })),
          )
          .find(
            ({ check }) => check.target === target && check.status === status,
          );

        if (match) {
          return [toReadinessRow(match.capsule, match.check)];
        }
      }

      const fallback = computedReadiness
        .flatMap(({ capsule, result }) =>
          result.readinessChecks.map((check) => ({ capsule, check })),
        )
        .find(({ check }) => check.target === target);

      return fallback ? [toReadinessRow(fallback.capsule, fallback.check)] : [];
    },
  );
}

function toReadinessRow(
  capsule: EvidenceCapsuleWithRelations,
  check: ReturnType<typeof computeReadiness>["readinessChecks"][number],
): PitchReadinessRow {
  return {
    target: check.target,
    status: check.status,
    score: check.score,
    summary: check.summary,
    capsuleNumber: capsule.capsuleNumber,
    reasonCodes: check.reasonCodes,
  };
}

function buildExceptions(capsules: EvidenceCapsuleWithRelations[]) {
  return {
    missingEvidence: capsules.flatMap((capsule) => capsule.missingEvidence),
    contradictions: capsules.flatMap((capsule) =>
      capsule.contradictions.map((item) => ({
        id: item.id,
        fieldKey: item.fieldKey,
        severity: item.severity,
        description: item.description,
        detail: `${item.leftSource}: ${item.leftValue} / ${item.rightSource}: ${item.rightValue}`,
        capsuleNumber: capsule.capsuleNumber,
      })),
    ),
    tasks: capsules.flatMap((capsule) => capsule.remediationTasks),
  };
}

function findCapsule(
  capsules: EvidenceCapsuleWithRelations[],
  id: string,
): EvidenceCapsuleWithRelations | undefined {
  return capsules.find((capsule) => capsule.id === id);
}

function labelForDocumentType(type: SourceDocument["type"]): string {
  const labels: Record<SourceDocument["type"], string> = {
    commercialInvoice: "Commercial invoice",
    packingList: "Packing list",
    erpExport: "ERP export",
    technicalDatasheet: "Technical datasheet",
    endUseStatement: "End-use statement",
    supplierEvidence: "Supplier evidence",
    brokerEmail: "Broker email",
    other: "Other document",
  };

  return labels[type];
}

function formatFromMimeType(mimeType: string): string {
  if (mimeType.includes("pdf")) {
    return "PDF";
  }

  if (mimeType.includes("spreadsheet")) {
    return "XLSX";
  }

  if (mimeType.includes("csv")) {
    return "CSV";
  }

  if (mimeType.includes("rfc822")) {
    return "Email";
  }

  if (mimeType.includes("text")) {
    return "TXT";
  }

  return "Mock file";
}
