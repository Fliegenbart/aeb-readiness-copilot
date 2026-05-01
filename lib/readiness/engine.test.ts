import { describe, expect, it } from "vitest";

import type {
  Contradiction,
  EvidenceCapsuleWithRelations,
  ExtractedField,
  MissingEvidence,
  SourceDocument,
} from "@/lib/domain/types";
import {
  computeReadiness,
  deriveRemediationTasks,
} from "@/lib/readiness/engine";

const now = new Date("2026-04-30T10:00:00.000Z");

function createCapsule(
  overrides: Partial<EvidenceCapsuleWithRelations> = {},
): EvidenceCapsuleWithRelations {
  const id = overrides.id ?? "capsule-test";

  return {
    id,
    capsuleNumber: "CAP-TEST",
    objectType: "shipment",
    title: "Test shipment",
    customerName: "Test Customer GmbH",
    destinationCountry: "Sweden",
    incoterm: "DAP Stockholm",
    status: "draft",
    overallReadinessScore: 0,
    createdAt: now,
    updatedAt: now,
    auditEvents: [],
    contradictions: [],
    extractedFields: [
      field("exporter", "Meyer Industrial GmbH"),
      field("exporter_address", "Main Street 1, Hamburg, Germany"),
      field("consignee", "Nordline Components AB"),
      field("consignee_address", "Dock Road 4, Gothenburg, Sweden"),
      field("destination_country", "Sweden"),
      field("invoice_value", "18420"),
      field("currency", "EUR"),
      field("line_items", "2"),
      field("hs_code", "848180"),
      field("country_of_origin", "DE"),
      field("gross_weight_kg", "892"),
      field("net_weight_kg", "840"),
      field("product_description", "Industrial stainless steel valve assembly"),
      field("product_attributes", "material=steel; pressure=16 bar"),
      field("classification_evidence_status", "pending"),
      field("technical_parameters_complete", "true"),
      field("end_user", "Nordline Components AB"),
      field("end_user_address", "Dock Road 4, Gothenburg, Sweden"),
      field("end_use", "Industrial maintenance"),
      field("end_use_statement_status", "current"),
      field("risk_questionnaire_status", "current"),
      field("license_evidence", "no license required"),
      field("dimensions", "120x80x75 cm"),
      field("package_count", "3"),
    ],
    missingEvidence: [],
    readinessChecks: [],
    remediationTasks: [],
    sourceDocuments: [
      document("commercialInvoice"),
      document("packingList"),
      document("technicalDatasheet"),
      document("endUseStatement"),
      document("supplierEvidence"),
    ],
    ...overrides,
  };
}

function document(type: SourceDocument["type"]): SourceDocument {
  return {
    id: `doc-${type}`,
    capsuleId: "capsule-test",
    type,
    filename: `${type}.pdf`,
    mimeType: "application/pdf",
    mockPath: `/mock/${type}.pdf`,
    uploadedAt: now,
  };
}

function field(fieldKey: string, value: string): ExtractedField {
  return {
    id: `field-${fieldKey}`,
    capsuleId: "capsule-test",
    fieldKey,
    label: fieldKey,
    value,
    normalizedValue: value,
    confidence: 0.95,
    sourceRef: "source.pdf page 1",
    createdAt: now,
  };
}

function missing(
  evidenceKey: string,
  requiredForTarget: MissingEvidence["requiredForTarget"],
  severity: MissingEvidence["severity"] = "blocking",
): MissingEvidence {
  return {
    id: `missing-${evidenceKey}`,
    capsuleId: "capsule-test",
    evidenceKey,
    label: evidenceKey,
    severity,
    requiredForTarget,
    suggestedAction: `Provide ${evidenceKey}.`,
  };
}

function contradiction(
  fieldKey: string,
  severity: Contradiction["severity"] = "blocking",
): Contradiction {
  return {
    id: `contra-${fieldKey}`,
    capsuleId: "capsule-test",
    fieldKey,
    severity,
    description: `${fieldKey} contradiction`,
    leftSource: "invoice.pdf page 1",
    leftValue: "100",
    rightSource: "packing-list.pdf page 1",
    rightValue: "120",
  };
}

function withoutFields(
  capsule: EvidenceCapsuleWithRelations,
  ...fieldKeys: string[]
): EvidenceCapsuleWithRelations {
  return {
    ...capsule,
    extractedFields: capsule.extractedFields.filter(
      (item) => !fieldKeys.includes(item.fieldKey),
    ),
  };
}

function withoutDocuments(
  capsule: EvidenceCapsuleWithRelations,
  ...types: SourceDocument["type"][]
): EvidenceCapsuleWithRelations {
  return {
    ...capsule,
    sourceDocuments: capsule.sourceDocuments.filter(
      (item) => !types.includes(item.type),
    ),
  };
}

function check(
  result: ReturnType<typeof computeReadiness>,
  target: string,
) {
  const found = result.readinessChecks.find((item) => item.target === target);
  if (!found) {
    throw new Error(`Missing readiness check for ${target}`);
  }
  return found;
}

describe("computeReadiness", () => {
  it("returns one readiness check for every AEB target", () => {
    const result = computeReadiness(createCapsule());

    expect(result.readinessChecks.map((item) => item.target)).toEqual([
      "CUSTOMS_BROKER_INTEGRATION",
      "CUSTOMS_MANAGEMENT",
      "PRODUCT_CLASSIFICATION",
      "EXPORT_CONTROLS",
      "COMPLIANCE_SCREENING",
      "LICENSE_MANAGEMENT",
      "RISK_ASSESSMENT",
      "CARRIER_CONNECT",
    ]);
  });

  it("marks a complete capsule ready with a high overall score", () => {
    const result = computeReadiness(createCapsule());

    expect(result.capsuleStatus).toBe("ready");
    expect(result.overallReadinessScore).toBeGreaterThanOrEqual(90);
  });

  it("blocks general readiness when the commercial invoice is missing", () => {
    const result = computeReadiness(
      withoutDocuments(createCapsule(), "commercialInvoice"),
    );

    expect(result.capsuleStatus).toBe("blocked");
    expect(result.reasons.map((reason) => reason.code)).toContain(
      "MISSING_COMMERCIAL_INVOICE",
    );
  });

  it("blocks physical shipments when the packing list is missing", () => {
    const result = computeReadiness(
      withoutDocuments(createCapsule(), "packingList"),
    );

    expect(result.capsuleStatus).toBe("blocked");
    expect(result.reasons.map((reason) => reason.code)).toContain(
      "MISSING_PACKING_LIST",
    );
  });

  it("does not require a packing list for material capsules", () => {
    const result = computeReadiness(
      withoutDocuments(
        createCapsule({ objectType: "material" }),
        "packingList",
      ),
    );

    expect(result.reasons.map((reason) => reason.code)).not.toContain(
      "MISSING_PACKING_LIST",
    );
  });

  it("warns when incoterm is missing", () => {
    const result = computeReadiness(createCapsule({ incoterm: "" }));

    expect(result.capsuleStatus).toBe("warning");
    expect(result.reasons.map((reason) => reason.code)).toContain(
      "MISSING_INCOTERM",
    );
  });

  it("warns when destination country is missing", () => {
    const result = computeReadiness(
      createCapsule({ destinationCountry: "Unknown" }),
    );

    expect(result.reasons.map((reason) => reason.code)).toContain(
      "MISSING_DESTINATION_COUNTRY",
    );
  });

  it("warns when gross or net weight is missing", () => {
    const result = computeReadiness(
      withoutFields(createCapsule(), "gross_weight_kg"),
    );

    expect(result.reasons.map((reason) => reason.code)).toContain(
      "MISSING_WEIGHT",
    );
  });

  it("generates remediation tasks from stored contradiction reason codes", () => {
    const result = computeReadiness(
      createCapsule({
        contradictions: [
          {
            ...contradiction("country_of_origin", "warning"),
            description:
              "ORIGIN_MISMATCH: Country of origin differs between product master and commercial invoice.",
          },
        ],
      }),
    );

    const tasks = deriveRemediationTasks(result);

    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reasonCode: "ORIGIN_MISMATCH",
          ownerRole: "supplier",
          title: "Request corrected origin evidence",
        }),
      ]),
    );
  });

  it("generates remediation tasks from stored missing evidence", () => {
    const result = computeReadiness(
      createCapsule({
        missingEvidence: [
          missing("current_end_use_statement", "EXPORT_CONTROLS", "blocking"),
        ],
      }),
    );

    const tasks = deriveRemediationTasks(result);

    expect(tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reasonCode: "END_USE_STATEMENT_EXPIRED",
          ownerRole: "customer",
          title: "Request current end-use statement",
        }),
      ]),
    );
  });

  it("blocks broker readiness when invoice is missing", () => {
    const result = computeReadiness(
      withoutDocuments(createCapsule(), "commercialInvoice"),
    );

    expect(check(result, "CUSTOMS_BROKER_INTEGRATION").status).toBe("blocked");
    expect(check(result, "CUSTOMS_BROKER_INTEGRATION").reasonCodes).toContain(
      "MISSING_COMMERCIAL_INVOICE",
    );
  });

  it("blocks broker readiness for a blocking invoice packing weight contradiction", () => {
    const result = computeReadiness(
      createCapsule({
        contradictions: [contradiction("gross_weight_kg", "blocking")],
      }),
    );

    expect(check(result, "CUSTOMS_BROKER_INTEGRATION").status).toBe("blocked");
    expect(check(result, "CUSTOMS_BROKER_INTEGRATION").reasonCodes).toContain(
      "BROKER_BLOCKING_WEIGHT_CONTRADICTION",
    );
  });

  it("warns broker readiness when HS code is missing", () => {
    const result = computeReadiness(withoutFields(createCapsule(), "hs_code"));

    expect(check(result, "CUSTOMS_BROKER_INTEGRATION").status).toBe("warning");
    expect(check(result, "CUSTOMS_BROKER_INTEGRATION").reasonCodes).toContain(
      "MISSING_HS_CODE",
    );
  });

  it("warns broker readiness when country of origin is missing", () => {
    const result = computeReadiness(
      withoutFields(createCapsule(), "country_of_origin"),
    );

    expect(check(result, "CUSTOMS_BROKER_INTEGRATION").status).toBe("warning");
    expect(check(result, "CUSTOMS_BROKER_INTEGRATION").reasonCodes).toContain(
      "MISSING_COUNTRY_OF_ORIGIN",
    );
  });

  it("blocks customs management when mandatory customs data is missing", () => {
    const result = computeReadiness(withoutFields(createCapsule(), "currency"));

    expect(check(result, "CUSTOMS_MANAGEMENT").status).toBe("blocked");
    expect(check(result, "CUSTOMS_MANAGEMENT").reasonCodes).toContain(
      "MISSING_MANDATORY_CUSTOMS_DATA",
    );
  });

  it("warns customs management when classification evidence is incomplete", () => {
    const result = computeReadiness(
      withoutFields(createCapsule(), "classification_evidence_status"),
    );

    expect(check(result, "CUSTOMS_MANAGEMENT").status).toBe("warning");
    expect(check(result, "CUSTOMS_MANAGEMENT").reasonCodes).toContain(
      "INCOMPLETE_CLASSIFICATION_OR_ORIGIN",
    );
  });

  it("marks product classification not applicable when all line items already have approved evidence", () => {
    const result = computeReadiness(
      createCapsule({
        extractedFields: [
          ...createCapsule().extractedFields.filter(
            (item) => item.fieldKey !== "classification_evidence_status",
          ),
          field("classification_evidence_status", "approved"),
        ],
      }),
    );

    expect(check(result, "PRODUCT_CLASSIFICATION").status).toBe("notApplicable");
    expect(check(result, "PRODUCT_CLASSIFICATION").reasonCodes).toContain(
      "CLASSIFICATION_ALREADY_APPROVED",
    );
  });

  it("warns product classification when the product description is weak", () => {
    const result = computeReadiness(
      createCapsule({
        extractedFields: [
          ...createCapsule().extractedFields.filter(
            (item) => item.fieldKey !== "product_description",
          ),
          field("product_description", "parts"),
        ],
      }),
    );

    expect(check(result, "PRODUCT_CLASSIFICATION").status).toBe("warning");
    expect(check(result, "PRODUCT_CLASSIFICATION").reasonCodes).toContain(
      "WEAK_PRODUCT_DESCRIPTION",
    );
  });

  it("warns product classification when the technical datasheet is missing", () => {
    const result = computeReadiness(
      withoutDocuments(createCapsule(), "technicalDatasheet"),
    );

    expect(check(result, "PRODUCT_CLASSIFICATION").status).toBe("warning");
    expect(check(result, "PRODUCT_CLASSIFICATION").reasonCodes).toContain(
      "MISSING_TECHNICAL_DATASHEET",
    );
  });

  it("blocks export controls when a required technical parameter is missing", () => {
    const result = computeReadiness(
      createCapsule({
        missingEvidence: [
          missing("sensor_sampling_rate", "EXPORT_CONTROLS", "blocking"),
        ],
      }),
    );

    expect(check(result, "EXPORT_CONTROLS").status).toBe("blocked");
    expect(check(result, "EXPORT_CONTROLS").reasonCodes).toContain(
      "MISSING_EXPORT_CONTROL_TECHNICAL_PARAMETER",
    );
  });

  it("blocks export controls when an end-use statement is expired", () => {
    const result = computeReadiness(
      createCapsule({
        extractedFields: [
          ...createCapsule().extractedFields.filter(
            (item) => item.fieldKey !== "end_use_statement_status",
          ),
          field("end_use_statement_status", "expired"),
        ],
      }),
    );

    expect(check(result, "EXPORT_CONTROLS").status).toBe("blocked");
    expect(check(result, "EXPORT_CONTROLS").reasonCodes).toContain(
      "END_USE_STATEMENT_EXPIRED_OR_MISSING",
    );
  });

  it("warns export controls when end user is incomplete", () => {
    const result = computeReadiness(withoutFields(createCapsule(), "end_user"));

    expect(check(result, "EXPORT_CONTROLS").status).toBe("warning");
    expect(check(result, "EXPORT_CONTROLS").reasonCodes).toContain(
      "INCOMPLETE_END_USER_OR_END_USE",
    );
  });

  it("blocks risk assessment when end-use questionnaire evidence is missing", () => {
    const result = computeReadiness(
      createCapsule({
        missingEvidence: [
          missing("end_use_questionnaire", "RISK_ASSESSMENT", "blocking"),
        ],
      }),
    );

    expect(check(result, "RISK_ASSESSMENT").status).toBe("blocked");
    expect(check(result, "RISK_ASSESSMENT").reasonCodes).toContain(
      "MISSING_RISK_QUESTIONNAIRE",
    );
  });

  it("warns risk assessment when questionnaire evidence is older than 12 months", () => {
    const result = computeReadiness(
      createCapsule({
        extractedFields: [
          ...createCapsule().extractedFields.filter(
            (item) => item.fieldKey !== "risk_questionnaire_status",
          ),
          field("risk_questionnaire_status", "older_than_12_months"),
        ],
      }),
    );

    expect(check(result, "RISK_ASSESSMENT").status).toBe("warning");
    expect(check(result, "RISK_ASSESSMENT").reasonCodes).toContain(
      "STALE_RISK_QUESTIONNAIRE",
    );
  });

  it("warns compliance screening when party addresses are incomplete", () => {
    const result = computeReadiness(
      withoutFields(createCapsule(), "end_user_address"),
    );

    expect(check(result, "COMPLIANCE_SCREENING").status).toBe("warning");
    expect(check(result, "COMPLIANCE_SCREENING").reasonCodes).toContain(
      "INCOMPLETE_PARTY_ADDRESSES",
    );
  });

  it("warns license management when possible license need has no license reference", () => {
    const result = computeReadiness(
      createCapsule({
        extractedFields: [
          ...createCapsule().extractedFields.filter(
            (item) => item.fieldKey !== "license_evidence",
          ),
          field("export_control_status", "possible_license_required"),
        ],
      }),
    );

    expect(check(result, "LICENSE_MANAGEMENT").status).toBe("warning");
    expect(check(result, "LICENSE_MANAGEMENT").reasonCodes).toContain(
      "POSSIBLE_LICENSE_NO_REFERENCE",
    );
  });

  it("marks license management ready when no-license-required evidence exists", () => {
    const result = computeReadiness(createCapsule());

    expect(check(result, "LICENSE_MANAGEMENT").status).toBe("ready");
    expect(check(result, "LICENSE_MANAGEMENT").reasonCodes).toContain(
      "LICENSE_EVIDENCE_READY",
    );
  });

  it("warns carrier connect when package count is missing", () => {
    const result = computeReadiness(
      withoutFields(createCapsule(), "package_count"),
    );

    expect(check(result, "CARRIER_CONNECT").status).toBe("warning");
    expect(check(result, "CARRIER_CONNECT").reasonCodes).toContain(
      "MISSING_CARRIER_LOGISTICS_DATA",
    );
  });

  it("is deterministic for identical input", () => {
    const capsule = createCapsule();

    expect(computeReadiness(capsule)).toEqual(computeReadiness(capsule));
  });
});

describe("deriveRemediationTasks", () => {
  it("creates task drafts from blocking and warning reasons", () => {
    const result = computeReadiness(
      withoutDocuments(withoutFields(createCapsule(), "hs_code"), "packingList"),
    );

    const tasks = deriveRemediationTasks(result);

    expect(tasks.length).toBeGreaterThanOrEqual(2);
    expect(tasks.map((task) => task.reasonCode)).toEqual(
      expect.arrayContaining(["MISSING_PACKING_LIST", "MISSING_HS_CODE"]),
    );
    expect(tasks.every((task) => task.status === "open")).toBe(true);
  });

  it("deduplicates task drafts by reason code", () => {
    const result = computeReadiness(
      withoutDocuments(createCapsule(), "commercialInvoice"),
    );

    const tasks = deriveRemediationTasks(result);
    const invoiceTasks = tasks.filter(
      (task) => task.reasonCode === "MISSING_COMMERCIAL_INVOICE",
    );

    expect(invoiceTasks).toHaveLength(1);
  });
});
