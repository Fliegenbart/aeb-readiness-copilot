import { describe, expect, it } from "vitest";

import {
  detectWeightContradictions,
  extractFieldsFromDocument,
  shouldResolveMissingEvidence,
} from "@/lib/extraction/document-service";
import type { ExtractedFieldDraft } from "@/lib/extraction/document-service";

describe("document upload extraction service", () => {
  it("extracts known invoice fields from demo CSV content", () => {
    const drafts = extractFieldsFromDocument({
      documentType: "commercialInvoice",
      filename: "invoice-demo.csv",
      mimeType: "text/csv",
      content: Buffer.from(
        [
          "invoice_value,currency,exporter,consignee,destination_country,line_item_count,hs_code,country_of_origin",
          "18420,EUR,AeroValve Systems GmbH,Nordline Components AB,Sweden,4,8481.80,Germany",
        ].join("\n"),
      ),
    });

    expect(fieldValue(drafts, "invoice_value")).toBe("18420");
    expect(fieldValue(drafts, "currency")).toBe("EUR");
    expect(fieldValue(drafts, "hs_code")).toBe("8481.80");
    expect(drafts.every((draft) => draft.sourceRef.includes("invoice-demo.csv"))).toBe(
      true,
    );
  });

  it("extracts packing list logistics fields from demo CSV content", () => {
    const drafts = extractFieldsFromDocument({
      documentType: "packingList",
      filename: "packing-demo.csv",
      mimeType: "text/csv",
      content: Buffer.from(
        [
          "gross_weight_kg,net_weight_kg,package_count,dimensions",
          "282,251,3 pallets,120 x 80 x 75 cm",
        ].join("\n"),
      ),
    });

    expect(fieldValue(drafts, "gross_weight_kg")).toBe("282");
    expect(fieldValue(drafts, "package_count")).toBe("3 pallets");
    expect(fieldValue(drafts, "dimensions")).toBe("120 x 80 x 75 cm");
  });

  it("extracts end-use statement fields from key-value TXT content", () => {
    const drafts = extractFieldsFromDocument({
      documentType: "endUseStatement",
      filename: "end-use.txt",
      mimeType: "text/plain",
      content: Buffer.from(
        [
          "End User: Gulf Energy Projects LLC",
          "End User Address: Dubai Industrial Zone, UAE",
          "End Use: Maintenance of refinery monitoring equipment",
          "Valid Until: 2026-12-31",
          "Risk Questionnaire Date: 2026-04-15",
        ].join("\n"),
      ),
    });

    expect(fieldValue(drafts, "end_user")).toBe("Gulf Energy Projects LLC");
    expect(fieldValue(drafts, "end_use_statement_status")).toBe("current");
    expect(fieldValue(drafts, "risk_questionnaire_date")).toBe("2026-04-15");
  });

  it("detects invoice and packing-list weight contradictions", () => {
    const contradictions = detectWeightContradictions([
      persistedField("gross_weight_kg", "228", "invoice.csv row 2", "commercialInvoice"),
      persistedField("gross_weight_kg", "282", "packing.csv row 2", "packingList"),
    ]);

    expect(contradictions).toEqual([
      expect.objectContaining({
        fieldKey: "gross_weight_kg",
        severity: "blocking",
        leftValue: "228",
        rightValue: "282",
      }),
    ]);
  });

  it("knows when current end-use evidence resolves a missing evidence blocker", () => {
    const drafts = [
      draft("end_use_statement_status", "current"),
      draft("end_user", "Gulf Energy Projects LLC"),
      draft("end_use", "Maintenance"),
    ];

    expect(shouldResolveMissingEvidence("current_end_use_statement", drafts)).toBe(
      true,
    );
  });
});

function fieldValue(drafts: ExtractedFieldDraft[], fieldKey: string) {
  return drafts.find((draft) => draft.fieldKey === fieldKey)?.value;
}

function draft(fieldKey: string, value: string): ExtractedFieldDraft {
  return {
    fieldKey,
    label: fieldKey,
    value,
    normalizedValue: value,
    confidence: 0.95,
    sourceRef: "demo.txt line 1",
  };
}

function persistedField(
  fieldKey: string,
  value: string,
  sourceRef: string,
  documentType: "commercialInvoice" | "packingList",
) {
  return {
    fieldKey,
    value,
    normalizedValue: value,
    sourceRef,
    sourceDocument: { type: documentType, filename: `${documentType}.csv` },
  };
}
