import type {
  AebTarget,
  EvidenceCapsuleStatus,
  EvidenceCapsuleWithRelations,
  EvidenceGapSeverity,
  OwnerRole,
  ReadinessStatus,
  RemediationTaskStatus,
} from "@/lib/domain/types";

export type ReadinessReason = {
  code: string;
  severity: EvidenceGapSeverity;
  message: string;
  target?: AebTarget;
  fieldKey?: string;
};

export type ReadinessCheckDraft = {
  capsuleId: string;
  target: AebTarget;
  status: ReadinessStatus;
  score: number;
  summary: string;
  reasonCodes: string[];
  details: {
    reasons: ReadinessReason[];
  };
};

export type ReadinessResult = {
  capsuleId: string;
  capsuleNumber: string;
  overallReadinessScore: number;
  capsuleStatus: EvidenceCapsuleStatus;
  readinessChecks: ReadinessCheckDraft[];
  reasons: ReadinessReason[];
};

export type RemediationTaskDraft = {
  capsuleId: string;
  title: string;
  description: string;
  ownerRole: OwnerRole;
  status: RemediationTaskStatus;
  reasonCode: string;
  target?: AebTarget;
  severity: EvidenceGapSeverity;
};

const AEB_TARGETS: AebTarget[] = [
  "CUSTOMS_BROKER_INTEGRATION",
  "CUSTOMS_MANAGEMENT",
  "PRODUCT_CLASSIFICATION",
  "EXPORT_CONTROLS",
  "COMPLIANCE_SCREENING",
  "LICENSE_MANAGEMENT",
  "RISK_ASSESSMENT",
  "CARRIER_CONNECT",
];

const CURRENT_EVIDENCE_DATE = new Date("2026-04-30T00:00:00.000Z");

export function computeReadiness(
  capsuleInput: EvidenceCapsuleWithRelations,
): ReadinessResult {
  const context = createContext(capsuleInput);
  const generalReasons = [
    ...evaluateGeneralDataQuality(context),
    ...evaluateStoredEvidenceIssues(context),
  ];
  const readinessChecks = AEB_TARGETS.map((target) =>
    evaluateTargetReadiness(context, target),
  );
  const allReasons = dedupeReasons([
    ...generalReasons,
    ...readinessChecks.flatMap((item) => item.details.reasons),
  ]);
  const overallReadinessScore = calculateOverallScore(
    readinessChecks,
    generalReasons,
  );

  return {
    capsuleId: capsuleInput.id,
    capsuleNumber: capsuleInput.capsuleNumber,
    overallReadinessScore,
    capsuleStatus: deriveCapsuleStatus(generalReasons, readinessChecks),
    readinessChecks,
    reasons: allReasons,
  };
}

export function deriveRemediationTasks(
  readinessResult: ReadinessResult,
): RemediationTaskDraft[] {
  const taskByReason = new Map<string, RemediationTaskDraft>();

  for (const reason of readinessResult.reasons) {
    if (reason.severity === "info") {
      continue;
    }

    if (!taskByReason.has(reason.code)) {
      taskByReason.set(reason.code, {
        capsuleId: readinessResult.capsuleId,
        title: titleForReason(reason.code),
        description: reason.message,
        ownerRole: ownerForReason(reason.code),
        status: "open",
        reasonCode: reason.code,
        target: reason.target,
        severity: reason.severity,
      });
    }
  }

  return [...taskByReason.values()];
}

type ReadinessContext = {
  capsule: EvidenceCapsuleWithRelations;
  fieldValues: Map<string, string>;
  documentTypes: Set<string>;
};

function createContext(capsule: EvidenceCapsuleWithRelations): ReadinessContext {
  return {
    capsule,
    fieldValues: new Map(
      capsule.extractedFields.map((field) => [
        normalizeKey(field.fieldKey),
        String(field.normalizedValue ?? field.value).trim(),
      ]),
    ),
    documentTypes: new Set(capsule.sourceDocuments.map((doc) => doc.type)),
  };
}

function evaluateGeneralDataQuality(
  context: ReadinessContext,
): ReadinessReason[] {
  const reasons: ReadinessReason[] = [];

  if (!hasDocument(context, "commercialInvoice")) {
    reasons.push(
      reason(
        "MISSING_COMMERCIAL_INVOICE",
        "blocking",
        "Commercial invoice is required before AEB-ready handover.",
        undefined,
        "commercialInvoice",
      ),
    );
  }

  if (isPhysicalShipment(context) && !hasDocument(context, "packingList")) {
    reasons.push(
      reason(
        "MISSING_PACKING_LIST",
        "blocking",
        "Packing list is required for a physical shipment.",
        undefined,
        "packingList",
      ),
    );
  }

  if (isBlank(context.capsule.incoterm)) {
    reasons.push(
      reason(
        "MISSING_INCOTERM",
        "warning",
        "Incoterm is missing and should be completed before handover.",
        undefined,
        "incoterm",
      ),
    );
  }

  if (isBlank(context.capsule.destinationCountry)) {
    reasons.push(
      reason(
        "MISSING_DESTINATION_COUNTRY",
        "warning",
        "Destination country is missing and should be completed before handover.",
        undefined,
        "destination_country",
      ),
    );
  }

  if (
    isPhysicalShipment(context) &&
    (!hasField(context, ["gross_weight_kg", "gross_weight"]) ||
      !hasField(context, ["net_weight_kg", "net_weight"]))
  ) {
    reasons.push(
      reason(
        "MISSING_WEIGHT",
        "warning",
        "Gross weight and net weight should both be present.",
        undefined,
        "weight",
      ),
    );
  }

  return reasons;
}

function evaluateStoredEvidenceIssues(
  context: ReadinessContext,
): ReadinessReason[] {
  return [
    ...context.capsule.contradictions
      .filter((item) => item.severity !== "info")
      .map((item) =>
        reason(
          reasonCodeForContradiction(item.description),
          item.severity,
          item.description,
          targetForEvidenceIssue(item.fieldKey, item.severity),
          item.fieldKey,
        ),
      ),
    ...context.capsule.missingEvidence
      .filter((item) => item.severity !== "info")
      .map((item) =>
        reason(
          reasonCodeForMissingEvidence(item.evidenceKey),
          item.severity,
          `${item.label}: ${item.suggestedAction}`,
          item.requiredForTarget,
          item.evidenceKey,
        ),
      ),
  ];
}

function evaluateTargetReadiness(
  context: ReadinessContext,
  target: AebTarget,
): ReadinessCheckDraft {
  switch (target) {
    case "CUSTOMS_BROKER_INTEGRATION":
      return brokerReadiness(context);
    case "CUSTOMS_MANAGEMENT":
      return customsManagementReadiness(context);
    case "PRODUCT_CLASSIFICATION":
      return productClassificationReadiness(context);
    case "EXPORT_CONTROLS":
      return exportControlsReadiness(context);
    case "COMPLIANCE_SCREENING":
      return complianceScreeningReadiness(context);
    case "LICENSE_MANAGEMENT":
      return licenseManagementReadiness(context);
    case "RISK_ASSESSMENT":
      return riskAssessmentReadiness(context);
    case "CARRIER_CONNECT":
      return carrierConnectReadiness(context);
  }
}

function brokerReadiness(context: ReadinessContext): ReadinessCheckDraft {
  const target: AebTarget = "CUSTOMS_BROKER_INTEGRATION";
  const reasons: ReadinessReason[] = [];

  if (!hasDocument(context, "commercialInvoice")) {
    reasons.push(
      reason(
        "MISSING_COMMERCIAL_INVOICE",
        "blocking",
        "Broker handover is blocked because the commercial invoice is missing.",
        target,
        "commercialInvoice",
      ),
    );
  }

  if (isPhysicalShipment(context) && !hasDocument(context, "packingList")) {
    reasons.push(
      reason(
        "MISSING_PACKING_LIST",
        "blocking",
        "Broker handover is blocked because the packing list is missing.",
        target,
        "packingList",
      ),
    );
  }

  if (hasBlockingWeightContradiction(context)) {
    reasons.push(
      reason(
        "BROKER_BLOCKING_WEIGHT_CONTRADICTION",
        "blocking",
        "Invoice and packing list weight contradiction must be resolved before broker handover.",
        target,
        "weight",
      ),
    );
  }

  if (!hasField(context, ["hs_code", "classification", "commodity_code"])) {
    reasons.push(
      reason(
        "MISSING_HS_CODE",
        "warning",
        "HS code or classification is missing for at least one line item.",
        target,
        "hs_code",
      ),
    );
  }

  if (!hasField(context, ["country_of_origin", "origin_country"])) {
    reasons.push(
      reason(
        "MISSING_COUNTRY_OF_ORIGIN",
        "warning",
        "Country of origin is missing for broker handover readiness.",
        target,
        "country_of_origin",
      ),
    );
  }

  return buildCheck(context, target, reasons, {
    ready: "Ready for broker handover.",
    warning: "Broker handover has warnings to review.",
    blocked: "Broker handover is blocked.",
    notApplicable: "Broker handover is not applicable.",
  });
}

function customsManagementReadiness(
  context: ReadinessContext,
): ReadinessCheckDraft {
  const target: AebTarget = "CUSTOMS_MANAGEMENT";
  const reasons: ReadinessReason[] = [];
  const missingMandatory = [
    ["exporter"],
    ["consignee"],
    ["destination_country"],
    ["invoice_value"],
    ["currency"],
    ["line_items", "line_item_count"],
  ].filter((keys) => !hasField(context, keys));

  if (missingMandatory.length > 0) {
    reasons.push(
      reason(
        "MISSING_MANDATORY_CUSTOMS_DATA",
        "blocking",
        "Mandatory customs data is incomplete: exporter, consignee, destination, invoice value, currency and line items are required.",
        target,
        "mandatory_customs_data",
      ),
    );
  }

  if (hasBlockingContradiction(context)) {
    reasons.push(
      reason(
        "BLOCKING_CONTRADICTION",
        "blocking",
        "A blocking data contradiction must be resolved before customs-management readiness.",
        target,
      ),
    );
  }

  if (
    !hasField(context, ["classification_evidence_status"]) ||
    !hasField(context, ["country_of_origin", "origin_evidence"])
  ) {
    reasons.push(
      reason(
        "INCOMPLETE_CLASSIFICATION_OR_ORIGIN",
        "warning",
        "Classification or origin evidence is incomplete.",
        target,
        "classification_origin_evidence",
      ),
    );
  }

  return buildCheck(context, target, reasons, {
    ready: "Mandatory customs data exists with no blocking contradiction.",
    warning: "Customs-management readiness has evidence warnings.",
    blocked: "Customs-management readiness is blocked by missing mandatory data.",
    notApplicable: "Customs management is not applicable.",
  });
}

function productClassificationReadiness(
  context: ReadinessContext,
): ReadinessCheckDraft {
  const target: AebTarget = "PRODUCT_CLASSIFICATION";

  if (valueIncludes(context, "classification_evidence_status", "approved")) {
    return {
      capsuleId: context.capsule.id,
      target,
      status: "notApplicable",
      score: 100,
      summary: "Product classification is already supported by approved evidence.",
      reasonCodes: ["CLASSIFICATION_ALREADY_APPROVED"],
      details: {
        reasons: [
          reason(
            "CLASSIFICATION_ALREADY_APPROVED",
            "info",
            "All line items already have approved classification evidence.",
            target,
            "classification_evidence_status",
          ),
        ],
      },
    };
  }

  const reasons: ReadinessReason[] = [];
  const description = fieldValue(context, ["product_description"]);

  if (!description || description.length < 10 || description.toLowerCase() === "parts") {
    reasons.push(
      reason(
        "WEAK_PRODUCT_DESCRIPTION",
        "warning",
        "Product description is too weak for a useful classification request payload preview.",
        target,
        "product_description",
      ),
    );
  }

  if (!hasDocument(context, "technicalDatasheet")) {
    reasons.push(
      reason(
        "MISSING_TECHNICAL_DATASHEET",
        "warning",
        "Technical datasheet is missing for product classification readiness.",
        target,
        "technicalDatasheet",
      ),
    );
  }

  if (!hasField(context, ["product_attributes", "technical_attributes"])) {
    reasons.push(
      reason(
        "INSUFFICIENT_PRODUCT_ATTRIBUTES",
        "warning",
        "Product attributes are incomplete for a classification request payload preview.",
        target,
        "product_attributes",
      ),
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      reason(
        "CLASSIFICATION_REQUEST_READY",
        "info",
        "Enough product attributes exist for a classification request payload preview.",
        target,
        "product_attributes",
      ),
    );
  }

  return buildCheck(context, target, reasons, {
    ready: "Product classification request payload preview is ready.",
    warning: "Product classification readiness needs more evidence.",
    blocked: "Product classification readiness is blocked.",
    notApplicable: "Product classification is not applicable.",
  });
}

function exportControlsReadiness(context: ReadinessContext): ReadinessCheckDraft {
  const target: AebTarget = "EXPORT_CONTROLS";
  const reasons: ReadinessReason[] = [];

  if (
    hasBlockingMissingEvidence(context, target) ||
    valueIncludes(context, "technical_parameters_complete", "false")
  ) {
    reasons.push(
      reason(
        "MISSING_EXPORT_CONTROL_TECHNICAL_PARAMETER",
        "blocking",
        "A technical parameter required for export-control review is missing.",
        target,
        "technical_parameters",
      ),
    );
  }

  if (
    !hasDocument(context, "endUseStatement") ||
    valueIncludes(context, "end_use_statement_status", "expired") ||
    valueIncludes(context, "end_use_statement_status", "missing")
  ) {
    reasons.push(
      reason(
        "END_USE_STATEMENT_EXPIRED_OR_MISSING",
        "blocking",
        "End-use statement is missing or expired where evidence is required.",
        target,
        "end_use_statement",
      ),
    );
  }

  if (!hasField(context, ["end_user"]) || !hasField(context, ["end_use"])) {
    reasons.push(
      reason(
        "INCOMPLETE_END_USER_OR_END_USE",
        "warning",
        "End user and end use evidence are incomplete.",
        target,
        "end_user_end_use",
      ),
    );
  }

  if (
    reasons.length === 0 &&
    hasField(context, ["technical_parameters_complete", "product_attributes"]) &&
    (hasField(context, ["destination_country"]) ||
      !isBlank(context.capsule.destinationCountry)) &&
    hasField(context, ["end_user"]) &&
    hasField(context, ["end_use"])
  ) {
    reasons.push(
      reason(
        "EXPORT_CONTROL_READY",
        "info",
        "Technical attributes, destination, end user and end use evidence exist.",
        target,
      ),
    );
  }

  return buildCheck(context, target, reasons, {
    ready: "Export-controls readiness evidence exists for review.",
    warning: "Export-controls readiness has incomplete end-user or end-use evidence.",
    blocked: "Export-controls readiness is blocked by missing or expired evidence.",
    notApplicable: "Export controls are not applicable.",
  });
}

function riskAssessmentReadiness(context: ReadinessContext): ReadinessCheckDraft {
  const target: AebTarget = "RISK_ASSESSMENT";
  const reasons: ReadinessReason[] = [];

  if (
    hasBlockingMissingEvidence(context, target) ||
    !hasField(context, ["risk_questionnaire_status", "risk_questionnaire_date"])
  ) {
    reasons.push(
      reason(
        "MISSING_RISK_QUESTIONNAIRE",
        "blocking",
        "Required end-use or end-user questionnaire evidence is missing.",
        target,
        "risk_questionnaire",
      ),
    );
  } else if (riskQuestionnaireIsStale(context)) {
    reasons.push(
      reason(
        "STALE_RISK_QUESTIONNAIRE",
        "warning",
        "Existing end-use or end-user questionnaire evidence is older than 12 months.",
        target,
        "risk_questionnaire",
      ),
    );
  } else {
    reasons.push(
      reason(
        "RISK_EVIDENCE_CURRENT",
        "info",
        "Current end-use or end-user questionnaire evidence exists.",
        target,
        "risk_questionnaire",
      ),
    );
  }

  return buildCheck(context, target, reasons, {
    ready: "Risk assessment evidence is current.",
    warning: "Risk assessment evidence should be refreshed.",
    blocked: "Risk assessment readiness is blocked by missing questionnaire evidence.",
    notApplicable: "Risk assessment is not applicable.",
  });
}

function complianceScreeningReadiness(
  context: ReadinessContext,
): ReadinessCheckDraft {
  const target: AebTarget = "COMPLIANCE_SCREENING";
  const reasons: ReadinessReason[] = [];
  const partyFields = [
    "exporter",
    "exporter_address",
    "consignee",
    "consignee_address",
    "end_user",
    "end_user_address",
  ];

  if (partyFields.some((fieldKey) => !hasField(context, [fieldKey]))) {
    reasons.push(
      reason(
        "INCOMPLETE_PARTY_ADDRESSES",
        "warning",
        "Party names or addresses are incomplete; no sanctions screening is performed.",
        target,
        "party_addresses",
      ),
    );
  } else {
    reasons.push(
      reason(
        "SCREENING_PARTIES_READY",
        "info",
        "Exporter, consignee and end user names and addresses are present. No sanctions screening is performed.",
        target,
        "party_addresses",
      ),
    );
  }

  return buildCheck(context, target, reasons, {
    ready: "Compliance-screening payload data is complete; no screening decision is made.",
    warning: "Compliance-screening payload data has incomplete party addresses.",
    blocked: "Compliance-screening readiness is blocked.",
    notApplicable: "Compliance screening is not applicable.",
  });
}

function licenseManagementReadiness(
  context: ReadinessContext,
): ReadinessCheckDraft {
  const target: AebTarget = "LICENSE_MANAGEMENT";
  const reasons: ReadinessReason[] = [];
  const possibleLicenseNeed = valueIncludes(
    context,
    "export_control_status",
    "possible_license_required",
  );
  const hasLicenseEvidence = hasField(context, [
    "license_reference",
    "license_evidence",
    "no_license_required",
  ]);

  if (possibleLicenseNeed && !hasLicenseEvidence) {
    reasons.push(
      reason(
        "POSSIBLE_LICENSE_NO_REFERENCE",
        "warning",
        "Export-control status indicates possible license need, but no license reference exists.",
        target,
        "license_reference",
      ),
    );
  } else if (hasLicenseEvidence) {
    reasons.push(
      reason(
        "LICENSE_EVIDENCE_READY",
        "info",
        "License reference or no-license-required evidence exists.",
        target,
        "license_evidence",
      ),
    );
  } else {
    reasons.push(
      reason(
        "LICENSE_EVIDENCE_MISSING",
        "warning",
        "License evidence is not present.",
        target,
        "license_evidence",
      ),
    );
  }

  return buildCheck(context, target, reasons, {
    ready: "License-management evidence is present.",
    warning: "License-management readiness has license evidence warnings.",
    blocked: "License-management readiness is blocked.",
    notApplicable: "License management is not applicable.",
  });
}

function carrierConnectReadiness(context: ReadinessContext): ReadinessCheckDraft {
  const target: AebTarget = "CARRIER_CONNECT";
  const reasons: ReadinessReason[] = [];
  const logisticsFields = [
    ["dimensions"],
    ["gross_weight_kg", "gross_weight"],
    ["net_weight_kg", "net_weight"],
    ["package_count", "packages"],
  ];

  if (logisticsFields.some((keys) => !hasField(context, keys))) {
    reasons.push(
      reason(
        "MISSING_CARRIER_LOGISTICS_DATA",
        "warning",
        "Dimensions, weight or package count are missing.",
        target,
        "carrier_logistics_data",
      ),
    );
  } else {
    reasons.push(
      reason(
        "CARRIER_DATA_READY",
        "info",
        "Shipment logistics data is complete for Carrier Connect readiness.",
        target,
        "carrier_logistics_data",
      ),
    );
  }

  return buildCheck(context, target, reasons, {
    ready: "Carrier Connect logistics data is complete.",
    warning: "Carrier Connect readiness has logistics data warnings.",
    blocked: "Carrier Connect readiness is blocked.",
    notApplicable: "Carrier Connect is not applicable.",
  });
}

function buildCheck(
  context: ReadinessContext,
  target: AebTarget,
  reasons: ReadinessReason[],
  summaries: Record<ReadinessStatus, string>,
): ReadinessCheckDraft {
  const status = statusFromReasons(reasons);

  return {
    capsuleId: context.capsule.id,
    target,
    status,
    score: scoreForStatus(status, reasons),
    summary: summaries[status],
    reasonCodes: reasons.map((item) => item.code),
    details: { reasons },
  };
}

function deriveCapsuleStatus(
  generalReasons: ReadinessReason[],
  checks: ReadinessCheckDraft[],
): EvidenceCapsuleStatus {
  if (
    generalReasons.some((reason) => reason.severity === "blocking") ||
    checks.some((check) => check.status === "blocked")
  ) {
    return "blocked";
  }

  if (
    generalReasons.some((reason) => reason.severity === "warning") ||
    checks.some((check) => check.status === "warning")
  ) {
    return "warning";
  }

  return "ready";
}

function calculateOverallScore(
  checks: ReadinessCheckDraft[],
  generalReasons: ReadinessReason[],
): number {
  const average =
    checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
  const penalty = generalReasons.reduce((sum, item) => {
    if (item.severity === "blocking") {
      return sum + 30;
    }

    if (item.severity === "warning") {
      return sum + 8;
    }

    return sum;
  }, 0);

  return clampScore(Math.round(average - penalty));
}

function statusFromReasons(reasons: ReadinessReason[]): ReadinessStatus {
  if (reasons.some((reasonItem) => reasonItem.severity === "blocking")) {
    return "blocked";
  }

  if (reasons.some((reasonItem) => reasonItem.severity === "warning")) {
    return "warning";
  }

  return "ready";
}

function scoreForStatus(
  status: ReadinessStatus,
  reasons: ReadinessReason[],
): number {
  if (status === "notApplicable") {
    return 100;
  }

  if (status === "blocked") {
    return clampScore(45 - reasons.length * 5);
  }

  if (status === "warning") {
    return clampScore(82 - reasons.length * 4);
  }

  return 100;
}

function reason(
  code: string,
  severity: EvidenceGapSeverity,
  message: string,
  target?: AebTarget,
  fieldKey?: string,
): ReadinessReason {
  return { code, severity, message, target, fieldKey };
}

function reasonCodeForContradiction(description: string): string {
  const prefix = description.split(":")[0]?.trim();

  if (prefix && /^[A-Z0-9_]+$/.test(prefix)) {
    return prefix;
  }

  return "DATA_CONTRADICTION";
}

function reasonCodeForMissingEvidence(evidenceKey: string): string {
  const codes: Record<string, string> = {
    current_end_use_statement: "END_USE_STATEMENT_EXPIRED",
    end_use_statement_expiring_soon: "END_USE_STATEMENT_EXPIRING_SOON",
    preferential_origin_statement: "MISSING_PREFERENTIAL_ORIGIN_EVIDENCE",
    sensor_sampling_rate: "MISSING_EXPORT_CONTROL_TECHNICAL_PARAMETER",
  };

  return codes[evidenceKey] ?? `MISSING_${evidenceKey.toUpperCase()}`;
}

function targetForEvidenceIssue(
  fieldKey: string,
  severity: EvidenceGapSeverity,
): AebTarget | undefined {
  if (["net_weight_kg", "gross_weight_kg"].includes(fieldKey)) {
    return "CUSTOMS_BROKER_INTEGRATION";
  }

  if (
    ["invoice_value", "currency", "incoterm", "destination_country"].includes(
      fieldKey,
    )
  ) {
    return severity === "blocking"
      ? "CUSTOMS_BROKER_INTEGRATION"
      : "CUSTOMS_MANAGEMENT";
  }

  if (fieldKey === "country_of_origin") {
    return "CUSTOMS_MANAGEMENT";
  }

  return undefined;
}

function dedupeReasons(reasons: ReadinessReason[]): ReadinessReason[] {
  const seen = new Set<string>();

  return reasons.filter((item) => {
    const key = `${item.code}:${item.target ?? "general"}:${item.fieldKey ?? ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function hasDocument(
  context: ReadinessContext,
  type: string,
): boolean {
  return context.documentTypes.has(type);
}

function hasField(context: ReadinessContext, keys: string[]): boolean {
  return Boolean(fieldValue(context, keys));
}

function fieldValue(
  context: ReadinessContext,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = context.fieldValues.get(normalizeKey(key));

    if (!isBlank(value)) {
      return value;
    }
  }

  return undefined;
}

function valueIncludes(
  context: ReadinessContext,
  fieldKey: string,
  expected: string,
): boolean {
  return (
    fieldValue(context, [fieldKey])?.toLowerCase().includes(expected) ?? false
  );
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  const normalized = String(value).trim().toLowerCase();

  return normalized.length === 0 || normalized === "unknown";
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function isPhysicalShipment(context: ReadinessContext): boolean {
  return context.capsule.objectType === "shipment";
}

function hasBlockingContradiction(context: ReadinessContext): boolean {
  return context.capsule.contradictions.some(
    (item) => item.severity === "blocking",
  );
}

function hasBlockingWeightContradiction(context: ReadinessContext): boolean {
  return context.capsule.contradictions.some(
    (item) =>
      item.severity === "blocking" &&
      (item.fieldKey.includes("weight") ||
        item.description.toLowerCase().includes("weight")),
  );
}

function hasBlockingMissingEvidence(
  context: ReadinessContext,
  target: AebTarget,
): boolean {
  return context.capsule.missingEvidence.some(
    (item) =>
      item.requiredForTarget === target && item.severity === "blocking",
  );
}

function riskQuestionnaireIsStale(context: ReadinessContext): boolean {
  const status = fieldValue(context, ["risk_questionnaire_status"]);

  if (status?.toLowerCase().includes("older_than_12_months")) {
    return true;
  }

  if (status?.toLowerCase().includes("stale")) {
    return true;
  }

  const dateValue = fieldValue(context, ["risk_questionnaire_date"]);

  if (!dateValue) {
    return false;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const ageMs = CURRENT_EVIDENCE_DATE.getTime() - date.getTime();
  const twelveMonthsMs = 365 * 24 * 60 * 60 * 1000;

  return ageMs > twelveMonthsMs;
}

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

function titleForReason(reasonCode: string): string {
  const titles: Record<string, string> = {
    MISSING_COMMERCIAL_INVOICE: "Add commercial invoice",
    MISSING_PACKING_LIST: "Add packing list",
    MISSING_INCOTERM: "Complete incoterm",
    MISSING_DESTINATION_COUNTRY: "Complete destination country",
    MISSING_WEIGHT: "Complete shipment weights",
    BROKER_BLOCKING_WEIGHT_CONTRADICTION: "Resolve weight contradiction",
    NET_WEIGHT_MISMATCH: "Correct invoice or packing list net weight",
    GROSS_WEIGHT_MISMATCH: "Correct invoice or packing list gross weight",
    INVOICE_VALUE_MISMATCH: "Align invoice value evidence",
    CURRENCY_MISMATCH: "Align invoice currency evidence",
    INCOTERM_MISMATCH: "Confirm incoterm",
    DESTINATION_COUNTRY_MISMATCH: "Align destination country evidence",
    ORIGIN_MISMATCH: "Request corrected origin evidence",
    MISSING_HS_CODE: "Add HS code or classification",
    MISSING_COUNTRY_OF_ORIGIN: "Add country of origin",
    MISSING_PREFERENTIAL_ORIGIN_EVIDENCE:
      "Request preferential origin evidence",
    MISSING_MANDATORY_CUSTOMS_DATA: "Complete mandatory customs data",
    INCOMPLETE_CLASSIFICATION_OR_ORIGIN: "Complete classification or origin evidence",
    WEAK_PRODUCT_DESCRIPTION: "Improve product description",
    MISSING_TECHNICAL_DATASHEET: "Add technical datasheet",
    INSUFFICIENT_PRODUCT_ATTRIBUTES: "Add product attributes",
    MISSING_EXPORT_CONTROL_TECHNICAL_PARAMETER:
      "Add export-control technical parameter",
    END_USE_STATEMENT_EXPIRED: "Request current end-use statement",
    END_USE_STATEMENT_EXPIRING_SOON: "Refresh end-use statement before expiry",
    END_USE_STATEMENT_EXPIRED_OR_MISSING: "Refresh end-use statement",
    INCOMPLETE_END_USER_OR_END_USE: "Complete end user and end use",
    MISSING_RISK_QUESTIONNAIRE: "Add risk questionnaire",
    STALE_RISK_QUESTIONNAIRE: "Refresh risk questionnaire",
    INCOMPLETE_PARTY_ADDRESSES: "Complete party addresses",
    POSSIBLE_LICENSE_NO_REFERENCE: "Add license reference",
    LICENSE_EVIDENCE_MISSING: "Add license evidence",
    MISSING_CARRIER_LOGISTICS_DATA: "Complete carrier logistics data",
  };

  return titles[reasonCode] ?? "Resolve readiness issue";
}

function ownerForReason(reasonCode: string): OwnerRole {
  if (
    [
      "MISSING_COMMERCIAL_INVOICE",
      "MISSING_PACKING_LIST",
      "MISSING_INCOTERM",
      "MISSING_DESTINATION_COUNTRY",
      "MISSING_WEIGHT",
      "BROKER_BLOCKING_WEIGHT_CONTRADICTION",
      "NET_WEIGHT_MISMATCH",
      "GROSS_WEIGHT_MISMATCH",
      "MISSING_CARRIER_LOGISTICS_DATA",
    ].includes(reasonCode)
  ) {
    return "logistics";
  }

  if (
    [
      "WEAK_PRODUCT_DESCRIPTION",
      "MISSING_TECHNICAL_DATASHEET",
      "INSUFFICIENT_PRODUCT_ATTRIBUTES",
      "MISSING_EXPORT_CONTROL_TECHNICAL_PARAMETER",
    ].includes(reasonCode)
  ) {
    return "engineering";
  }

  if (
    [
      "END_USE_STATEMENT_EXPIRED_OR_MISSING",
      "END_USE_STATEMENT_EXPIRED",
      "END_USE_STATEMENT_EXPIRING_SOON",
      "INCOMPLETE_END_USER_OR_END_USE",
      "MISSING_RISK_QUESTIONNAIRE",
      "STALE_RISK_QUESTIONNAIRE",
    ].includes(reasonCode)
  ) {
    return "customer";
  }

  if (
    [
      "MISSING_COUNTRY_OF_ORIGIN",
      "INCOMPLETE_CLASSIFICATION_OR_ORIGIN",
      "ORIGIN_MISMATCH",
      "MISSING_PREFERENTIAL_ORIGIN_EVIDENCE",
    ].includes(reasonCode)
  ) {
    return "supplier";
  }

  if (
    [
      "INVOICE_VALUE_MISMATCH",
      "CURRENCY_MISMATCH",
      "DESTINATION_COUNTRY_MISMATCH",
    ].includes(reasonCode)
  ) {
    return "broker";
  }

  return "tradeCompliance";
}
