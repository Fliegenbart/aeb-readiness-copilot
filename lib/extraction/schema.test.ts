import { describe, expect, it } from "vitest";

import {
  LOW_CONFIDENCE_THRESHOLD,
  normalizeAndValidateExtractedFieldDrafts,
} from "@/lib/extraction/schema";

describe("extraction schema validation", () => {
  it("rejects extracted fields that do not preserve source references", () => {
    expect(() =>
      normalizeAndValidateExtractedFieldDrafts([
        {
          fieldName: "invoiceNumber",
          value: "INV-2026-001",
          confidence: 0.91,
          provider: "mock-ai",
          documentType: "commercial-invoice",
          needsReview: false,
          isAcceptedEvidence: true,
        },
      ]),
    ).toThrow(/sourceReference/);
  });

  it("marks low-confidence fields for review instead of treating them as truth", () => {
    const [field] = normalizeAndValidateExtractedFieldDrafts([
      {
        fieldName: "grossWeightKg",
        value: 1265,
        confidence: LOW_CONFIDENCE_THRESHOLD - 0.01,
        provider: "mock-ai",
        documentType: "packing-list",
        sourceReference: {
          label: "Packing list row 4",
          excerpt: "Gross weight appears handwritten as 1265 kg",
        },
        needsReview: false,
        isAcceptedEvidence: true,
      },
    ]);

    expect(field.needsReview).toBe(true);
    expect(field.isAcceptedEvidence).toBe(false);
    expect(field.safetyNotes).toContain("Low confidence: human review required.");
  });

  it("rejects legal or customs conclusion fields from AI-like output", () => {
    expect(() =>
      normalizeAndValidateExtractedFieldDrafts([
        {
          fieldName: "customsConclusion",
          value: "Ready to file",
          confidence: 0.95,
          provider: "mock-ai",
          documentType: "commercial-invoice",
          sourceReference: {
            label: "AI output",
            excerpt: "Ready to file",
          },
          needsReview: false,
          isAcceptedEvidence: true,
        },
      ]),
    ).toThrow(/legal or customs conclusions/);
  });
});
