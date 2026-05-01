import { describe, expect, it } from "vitest";

import type {
  EvidenceCapsuleWithRelations,
  ExtractedField,
  SourceDocument,
} from "@/lib/domain/types";
import {
  compareExtractedFieldContradictions,
  severityForPercentageDifference,
} from "@/lib/readiness/contradictions";

const now = new Date("2026-04-30T10:00:00.000Z");

describe("readiness contradiction detection", () => {
  it("does not create contradictions when compared values match", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("invoice-net", "commercialInvoice", "net_weight_kg", "100"),
        field("packing-net", "packingList", "net_weight_kg", "100"),
      ]),
    );

    expect(result.contradictions).toHaveLength(0);
  });

  it("creates a warning for net weight differences up to 2 percent", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("invoice-net", "commercialInvoice", "net_weight_kg", "100"),
        field("packing-net", "packingList", "net_weight_kg", "102"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "net_weight_kg",
      severity: "warning",
      reasonCode: "NET_WEIGHT_MISMATCH",
    });
  });

  it("creates a blocking contradiction for net weight differences over 2 percent", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("invoice-net", "commercialInvoice", "net_weight_kg", "100"),
        field("packing-net", "packingList", "net_weight_kg", "103"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      severity: "blocking",
      reasonCode: "NET_WEIGHT_MISMATCH",
    });
  });

  it("creates a warning for gross weight differences up to 2 percent", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("invoice-gross", "commercialInvoice", "gross_weight_kg", "1000"),
        field("packing-gross", "packingList", "gross_weight_kg", "1010"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "gross_weight_kg",
      severity: "warning",
      reasonCode: "GROSS_WEIGHT_MISMATCH",
    });
  });

  it("creates a blocking contradiction for gross weight differences over 2 percent", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("invoice-gross", "commercialInvoice", "gross_weight_kg", "228"),
        field("packing-gross", "packingList", "gross_weight_kg", "282"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "gross_weight_kg",
      severity: "blocking",
      reasonCode: "GROSS_WEIGHT_MISMATCH",
    });
  });

  it("creates a warning for invoice value differences up to 1 percent", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("erp-value", "erpExport", "invoice_value", "1000"),
        field("invoice-value", "commercialInvoice", "invoice_value", "1010"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "invoice_value",
      severity: "warning",
      reasonCode: "INVOICE_VALUE_MISMATCH",
    });
  });

  it("creates a blocking contradiction for invoice value differences over 1 percent", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("erp-value", "erpExport", "invoice_value", "1000"),
        field("invoice-value", "commercialInvoice", "invoice_value", "1011"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "invoice_value",
      severity: "blocking",
      reasonCode: "INVOICE_VALUE_MISMATCH",
    });
  });

  it("creates a blocking contradiction for ERP and invoice currency mismatch", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("erp-currency", "erpExport", "currency", "EUR"),
        field("invoice-currency", "commercialInvoice", "currency", "USD"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "currency",
      severity: "blocking",
      reasonCode: "CURRENCY_MISMATCH",
    });
  });

  it("creates a warning for ERP and invoice incoterm mismatch", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("erp-incoterm", "erpExport", "incoterm", "DAP Oslo"),
        field("invoice-incoterm", "commercialInvoice", "incoterm", "FCA Hamburg"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "incoterm",
      severity: "warning",
      reasonCode: "INCOTERM_MISMATCH",
    });
  });

  it("creates a blocking contradiction for ERP and invoice destination mismatch", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("erp-destination", "erpExport", "destination_country", "Sweden"),
        field(
          "invoice-destination",
          "commercialInvoice",
          "destination_country",
          "Norway",
        ),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "destination_country",
      severity: "blocking",
      reasonCode: "DESTINATION_COUNTRY_MISMATCH",
    });
  });

  it("creates a warning for product master and invoice origin mismatch", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("master-origin", "erpExport", "country_of_origin", "Germany"),
        field("invoice-origin", "commercialInvoice", "country_of_origin", "France"),
      ]),
    );

    expect(result.contradictions[0]).toMatchObject({
      fieldKey: "country_of_origin",
      severity: "warning",
      reasonCode: "ORIGIN_MISMATCH",
    });
  });

  it("creates blocking missing evidence when end-use statement is expired", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field(
          "end-use-expiry",
          "endUseStatement",
          "end_use_statement_expiry",
          "2026-04-01",
        ),
      ]),
      { today: new Date("2026-04-30T00:00:00.000Z") },
    );

    expect(result.missingEvidence[0]).toMatchObject({
      evidenceKey: "current_end_use_statement",
      severity: "blocking",
      reasonCode: "END_USE_STATEMENT_EXPIRED",
    });
  });

  it("creates warning missing evidence when end-use statement expires within 30 days", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field(
          "end-use-expiry",
          "endUseStatement",
          "end_use_statement_expiry",
          "2026-05-20",
        ),
      ]),
      { today: new Date("2026-04-30T00:00:00.000Z") },
    );

    expect(result.missingEvidence[0]).toMatchObject({
      evidenceKey: "end_use_statement_expiring_soon",
      severity: "warning",
      reasonCode: "END_USE_STATEMENT_EXPIRING_SOON",
    });
  });

  it("does not create expiry issues when end-use statement is valid beyond 30 days", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field(
          "end-use-expiry",
          "endUseStatement",
          "end_use_statement_expiry",
          "2026-07-01",
        ),
      ]),
      { today: new Date("2026-04-30T00:00:00.000Z") },
    );

    expect(result.missingEvidence).toHaveLength(0);
  });

  it("uses the newest end-use expiry evidence when older expired evidence remains stored", () => {
    const oldExpired = field(
      "old-end-use-expiry",
      "endUseStatement",
      "end_use_statement_expiry",
      "2026-04-01",
    );
    const newCurrent = {
      ...field(
        "new-end-use-expiry",
        "endUseStatement",
        "end_use_statement_expiry",
        "2026-12-31",
      ),
      createdAt: new Date("2026-05-01T10:00:00.000Z"),
      confidence: 0.8,
    };
    const result = compareExtractedFieldContradictions(
      capsule([oldExpired, newCurrent]),
      { today: new Date("2026-04-30T00:00:00.000Z") },
    );

    expect(result.missingEvidence).toHaveLength(0);
  });

  it("ignores non-numeric percentage comparisons", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("erp-value", "erpExport", "invoice_value", "TBD"),
        field("invoice-value", "commercialInvoice", "invoice_value", "1011"),
      ]),
    );

    expect(result.contradictions).toHaveLength(0);
  });

  it("collects reason codes across contradictions and expiry issues", () => {
    const result = compareExtractedFieldContradictions(
      capsule([
        field("erp-currency", "erpExport", "currency", "EUR"),
        field("invoice-currency", "commercialInvoice", "currency", "USD"),
        field(
          "end-use-expiry",
          "endUseStatement",
          "end_use_statement_expiry",
          "2026-04-01",
        ),
      ]),
      { today: new Date("2026-04-30T00:00:00.000Z") },
    );

    expect(result.reasonCodes).toEqual([
      "CURRENCY_MISMATCH",
      "END_USE_STATEMENT_EXPIRED",
    ]);
  });

  it("keeps exact threshold differences as warnings", () => {
    expect(severityForPercentageDifference(100, 102, 2)).toBe("warning");
    expect(severityForPercentageDifference(1000, 1010, 1)).toBe("warning");
  });
});

function capsule(fields: ExtractedField[]): EvidenceCapsuleWithRelations {
  const sourceDocuments = uniqueDocuments(fields);

  return {
    id: "cap-test",
    capsuleNumber: "CAP-TEST",
    objectType: "shipment",
    title: "Test capsule",
    customerName: "Test Customer",
    destinationCountry: "Sweden",
    incoterm: "DAP Stockholm",
    status: "draft",
    overallReadinessScore: 0,
    createdAt: now,
    updatedAt: now,
    auditEvents: [],
    contradictions: [],
    extractedFields: fields,
    missingEvidence: [],
    readinessChecks: [],
    remediationTasks: [],
    sourceDocuments,
  };
}

function field(
  id: string,
  sourceType: SourceDocument["type"],
  fieldKey: string,
  value: string,
): ExtractedField {
  return {
    id,
    capsuleId: "cap-test",
    sourceDocumentId: `doc-${sourceType}`,
    fieldKey,
    label: fieldKey,
    value,
    normalizedValue: value,
    confidence: 0.95,
    sourceRef: `${sourceType}.csv row 2`,
    createdAt: now,
  };
}

function uniqueDocuments(fields: ExtractedField[]): SourceDocument[] {
  const sourceTypes = new Set(
    fields.flatMap((item) =>
      item.sourceDocumentId ? [item.sourceDocumentId.replace("doc-", "")] : [],
    ),
  );

  return [...sourceTypes].map((type) => ({
    id: `doc-${type}`,
    capsuleId: "cap-test",
    type: type as SourceDocument["type"],
    filename: `${type}.csv`,
    mimeType: "text/csv",
    mockPath: `/mock/${type}.csv`,
    uploadedAt: now,
  }));
}
