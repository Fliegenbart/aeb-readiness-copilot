import type {
  AebTarget,
  Contradiction,
  EvidenceCapsuleWithRelations,
  EvidenceGapSeverity,
  ExtractedField,
  MissingEvidence,
  SourceDocument,
} from "@/lib/domain/types";

export type ContradictionReasonCode =
  | "NET_WEIGHT_MISMATCH"
  | "GROSS_WEIGHT_MISMATCH"
  | "INVOICE_VALUE_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "INCOTERM_MISMATCH"
  | "DESTINATION_COUNTRY_MISMATCH"
  | "ORIGIN_MISMATCH";

export type MissingEvidenceReasonCode =
  | "END_USE_STATEMENT_EXPIRED"
  | "END_USE_STATEMENT_EXPIRING_SOON";

export type ContradictionDraft = Omit<Contradiction, "id" | "capsuleId"> & {
  reasonCode: ContradictionReasonCode;
};

export type MissingEvidenceDraft = Omit<MissingEvidence, "id" | "capsuleId"> & {
  reasonCode: MissingEvidenceReasonCode;
  sourceRef?: string;
};

export type ContradictionComparisonResult = {
  contradictions: ContradictionDraft[];
  missingEvidence: MissingEvidenceDraft[];
  reasonCodes: Array<ContradictionReasonCode | MissingEvidenceReasonCode>;
};

export type ContradictionComparisonOptions = {
  today?: Date;
};

type SourceRole =
  | "commercialInvoice"
  | "packingList"
  | "erp"
  | "productMaster"
  | "endUseStatement";

type FieldWithSource = ExtractedField & {
  sourceDocument?: SourceDocument;
};

const MANAGED_CONTRADICTION_FIELD_KEYS = [
  "net_weight_kg",
  "gross_weight_kg",
  "invoice_value",
  "currency",
  "incoterm",
  "destination_country",
  "country_of_origin",
];

export const MANAGED_MISSING_EVIDENCE_KEYS = [
  "current_end_use_statement",
  "end_use_statement_expiring_soon",
];

const weightComparisons = [
  {
    fieldKey: "net_weight_kg",
    aliases: ["net_weight_kg", "net_weight", "netWeight"],
    label: "Net weight",
    reasonCode: "NET_WEIGHT_MISMATCH" as const,
  },
  {
    fieldKey: "gross_weight_kg",
    aliases: ["gross_weight_kg", "gross_weight", "grossWeight"],
    label: "Gross weight",
    reasonCode: "GROSS_WEIGHT_MISMATCH" as const,
  },
];

export function compareExtractedFieldContradictions(
  capsule: EvidenceCapsuleWithRelations,
  options: ContradictionComparisonOptions = {},
): ContradictionComparisonResult {
  const fields = withSourceDocuments(capsule);
  const contradictions = [
    ...compareWeightFields(fields),
    ...compareInvoiceValue(fields),
    ...compareTextField({
      fields,
      fieldKey: "currency",
      aliases: ["currency"],
      leftRole: "erp",
      rightRole: "commercialInvoice",
      severity: "blocking",
      reasonCode: "CURRENCY_MISMATCH",
      label: "Currency",
    }),
    ...compareTextField({
      fields,
      fieldKey: "incoterm",
      aliases: ["incoterm", "inco_term"],
      leftRole: "erp",
      rightRole: "commercialInvoice",
      severity: "warning",
      reasonCode: "INCOTERM_MISMATCH",
      label: "Incoterm",
    }),
    ...compareTextField({
      fields,
      fieldKey: "destination_country",
      aliases: ["destination_country", "destination", "destinationCountry"],
      leftRole: "erp",
      rightRole: "commercialInvoice",
      severity: "blocking",
      reasonCode: "DESTINATION_COUNTRY_MISMATCH",
      label: "Destination country",
    }),
    ...compareTextField({
      fields,
      fieldKey: "country_of_origin",
      aliases: ["country_of_origin", "origin_country", "origin"],
      leftRole: "productMaster",
      rightRole: "commercialInvoice",
      severity: "warning",
      reasonCode: "ORIGIN_MISMATCH",
      label: "Country of origin",
    }),
  ];
  const missingEvidence = detectExpiredEvidence(
    fields,
    options.today ?? new Date(),
  );

  return {
    contradictions,
    missingEvidence,
    reasonCodes: [
      ...contradictions.map((item) => item.reasonCode),
      ...missingEvidence.map((item) => item.reasonCode),
    ],
  };
}

export function severityForPercentageDifference(
  leftValue: number,
  rightValue: number,
  blockingThresholdPercent: number,
): "warning" | "blocking" | null {
  if (leftValue === rightValue) {
    return null;
  }

  const difference = percentageDifference(leftValue, rightValue);

  if (difference === 0) {
    return null;
  }

  return difference > blockingThresholdPercent ? "blocking" : "warning";
}

export function managedContradictionFieldKeys(): string[] {
  return [...MANAGED_CONTRADICTION_FIELD_KEYS];
}

function compareWeightFields(fields: FieldWithSource[]): ContradictionDraft[] {
  return weightComparisons.flatMap((comparison) => {
    const invoiceField = findField(fields, "commercialInvoice", comparison.aliases);
    const packingField = findField(fields, "packingList", comparison.aliases);

    if (!invoiceField || !packingField) {
      return [];
    }

    const invoiceValue = numericValue(valueOf(invoiceField));
    const packingValue = numericValue(valueOf(packingField));

    if (invoiceValue === undefined || packingValue === undefined) {
      return [];
    }

    const severity = severityForPercentageDifference(
      invoiceValue,
      packingValue,
      2,
    );

    if (!severity) {
      return [];
    }

    return [
      createContradiction({
        fieldKey: comparison.fieldKey,
        reasonCode: comparison.reasonCode,
        severity,
        label: comparison.label,
        leftField: invoiceField,
        rightField: packingField,
        leftLabel: "commercial invoice",
        rightLabel: "packing list",
      }),
    ];
  });
}

function compareInvoiceValue(fields: FieldWithSource[]): ContradictionDraft[] {
  const erpField = findField(fields, "erp", ["invoice_value", "invoiceValue", "value"]);
  const invoiceField = findField(fields, "commercialInvoice", [
    "invoice_value",
    "invoiceValue",
    "value",
  ]);

  if (!erpField || !invoiceField) {
    return [];
  }

  const erpValue = numericValue(valueOf(erpField));
  const invoiceValue = numericValue(valueOf(invoiceField));

  if (erpValue === undefined || invoiceValue === undefined) {
    return [];
  }

  const severity = severityForPercentageDifference(erpValue, invoiceValue, 1);

  if (!severity) {
    return [];
  }

  return [
    createContradiction({
      fieldKey: "invoice_value",
      reasonCode: "INVOICE_VALUE_MISMATCH",
      severity,
      label: "Invoice value",
      leftField: erpField,
      rightField: invoiceField,
      leftLabel: "ERP export",
      rightLabel: "commercial invoice",
    }),
  ];
}

function compareTextField({
  fields,
  fieldKey,
  aliases,
  leftRole,
  rightRole,
  severity,
  reasonCode,
  label,
}: {
  fields: FieldWithSource[];
  fieldKey: string;
  aliases: string[];
  leftRole: SourceRole;
  rightRole: SourceRole;
  severity: EvidenceGapSeverity;
  reasonCode: ContradictionReasonCode;
  label: string;
}): ContradictionDraft[] {
  const leftField = findField(fields, leftRole, aliases);
  const rightField = findField(fields, rightRole, aliases);

  if (!leftField || !rightField) {
    return [];
  }

  if (normalizeComparableText(valueOf(leftField)) === normalizeComparableText(valueOf(rightField))) {
    return [];
  }

  return [
    createContradiction({
      fieldKey,
      reasonCode,
      severity,
      label,
      leftField,
      rightField,
      leftLabel: sourceRoleLabel(leftRole),
      rightLabel: sourceRoleLabel(rightRole),
    }),
  ];
}

function detectExpiredEvidence(
  fields: FieldWithSource[],
  today: Date,
): MissingEvidenceDraft[] {
  const expiryField = findLatestField(fields, "endUseStatement", [
    "end_use_statement_expiry",
    "endUseStatementExpiry",
    "valid_until",
    "expiry_date",
  ]);

  if (!expiryField) {
    return [];
  }

  const expiryDate = parseDate(valueOf(expiryField));

  if (!expiryDate) {
    return [];
  }

  const todayStart = startOfUtcDay(today);
  const expiryStart = startOfUtcDay(expiryDate);

  if (expiryStart < todayStart) {
    return [
      {
        evidenceKey: "current_end_use_statement",
        label: "Current end-use statement",
        severity: "blocking",
        requiredForTarget: "EXPORT_CONTROLS",
        suggestedAction:
          "Request a refreshed end-use statement before export-control readiness review.",
        reasonCode: "END_USE_STATEMENT_EXPIRED",
        sourceRef: expiryField.sourceRef,
      },
    ];
  }

  const daysUntilExpiry =
    (expiryStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000);

  if (daysUntilExpiry <= 30) {
    return [
      {
        evidenceKey: "end_use_statement_expiring_soon",
        label: "End-use statement expiring soon",
        severity: "warning",
        requiredForTarget: "EXPORT_CONTROLS",
        suggestedAction:
          "Request refreshed end-use evidence or confirm it will remain current for handover.",
        reasonCode: "END_USE_STATEMENT_EXPIRING_SOON",
        sourceRef: expiryField.sourceRef,
      },
    ];
  }

  return [];
}

function createContradiction({
  fieldKey,
  reasonCode,
  severity,
  label,
  leftField,
  rightField,
  leftLabel,
  rightLabel,
}: {
  fieldKey: string;
  reasonCode: ContradictionReasonCode;
  severity: EvidenceGapSeverity;
  label: string;
  leftField: FieldWithSource;
  rightField: FieldWithSource;
  leftLabel: string;
  rightLabel: string;
}): ContradictionDraft {
  return {
    fieldKey,
    severity,
    description: `${reasonCode}: ${label} differs between ${leftLabel} and ${rightLabel}.`,
    leftSource: leftField.sourceRef,
    leftValue: leftField.value,
    rightSource: rightField.sourceRef,
    rightValue: rightField.value,
    reasonCode,
  };
}

function findLatestField(
  fields: FieldWithSource[],
  sourceRole: SourceRole,
  aliases: string[],
): FieldWithSource | undefined {
  const normalizedAliases = aliases.map(normalizeKey);

  return fields
    .filter((field) => normalizedAliases.includes(normalizeKey(field.fieldKey)))
    .filter((field) => fieldMatchesSourceRole(field, sourceRole))
    .sort((left, right) => {
      const createdAtDiff = right.createdAt.getTime() - left.createdAt.getTime();

      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return right.confidence - left.confidence;
    })[0];
}

function findField(
  fields: FieldWithSource[],
  sourceRole: SourceRole,
  aliases: string[],
): FieldWithSource | undefined {
  const normalizedAliases = aliases.map(normalizeKey);

  return fields
    .filter((field) => normalizedAliases.includes(normalizeKey(field.fieldKey)))
    .filter((field) => fieldMatchesSourceRole(field, sourceRole))
    .sort(fieldPriority)[0];
}

function fieldMatchesSourceRole(
  field: FieldWithSource,
  sourceRole: SourceRole,
): boolean {
  const type = field.sourceDocument?.type;
  const sourceText = `${field.sourceDocument?.filename ?? ""} ${field.sourceRef}`.toLowerCase();

  if (sourceRole === "commercialInvoice") {
    return type === "commercialInvoice" || sourceText.includes("invoice");
  }

  if (sourceRole === "packingList") {
    return (
      type === "packingList" ||
      sourceText.includes("packing") ||
      sourceText.includes("pack-list")
    );
  }

  if (sourceRole === "erp") {
    return type === "erpExport" || sourceText.includes("erp");
  }

  if (sourceRole === "productMaster") {
    return (
      type === "erpExport" ||
      sourceText.includes("product-master") ||
      sourceText.includes("product master")
    );
  }

  return (
    type === "endUseStatement" ||
    sourceText.includes("end-use") ||
    sourceText.includes("end use")
  );
}

function withSourceDocuments(
  capsule: EvidenceCapsuleWithRelations,
): FieldWithSource[] {
  const documentsById = new Map(
    capsule.sourceDocuments.map((document) => [document.id, document]),
  );

  return capsule.extractedFields.map((field) => ({
    ...field,
    sourceDocument: field.sourceDocumentId
      ? documentsById.get(field.sourceDocumentId)
      : undefined,
  }));
}

function fieldPriority(left: FieldWithSource, right: FieldWithSource): number {
  if (right.confidence !== left.confidence) {
    return right.confidence - left.confidence;
  }

  return right.createdAt.getTime() - left.createdAt.getTime();
}

function percentageDifference(leftValue: number, rightValue: number): number {
  const difference = Math.abs(leftValue - rightValue);

  if (difference === 0) {
    return 0;
  }

  if (leftValue === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return (difference / Math.abs(leftValue)) * 100;
}

function numericValue(value: string): number | undefined {
  const normalized = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/)?.[0];
  const parsed = normalized ? Number(normalized) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeComparableText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:]/g, "");
}

function valueOf(field: ExtractedField): string {
  return String(field.normalizedValue ?? field.value);
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseDate(value: string): Date | undefined {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function sourceRoleLabel(sourceRole: SourceRole): string {
  const labels: Record<SourceRole, string> = {
    commercialInvoice: "commercial invoice",
    packingList: "packing list",
    erp: "ERP export",
    productMaster: "product master",
    endUseStatement: "end-use statement",
  };

  return labels[sourceRole];
}
