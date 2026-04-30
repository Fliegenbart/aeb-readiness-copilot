import { normalizeAndValidateExtractedFieldDrafts } from "@/lib/extraction/schema";
import type {
  CapsuleContext,
  EvidenceExtractionProvider,
  ExtractedFieldDraft,
  TradeDocumentType,
} from "@/lib/extraction/types";

export class MockAIProvider implements EvidenceExtractionProvider {
  name = "mock-ai" as const;

  extract(
    documentText: string,
    documentType: TradeDocumentType,
    capsuleContext: CapsuleContext,
  ): ExtractedFieldDraft[] {
    const reference = capsuleContext.shipmentReference ?? "Unknown shipment";
    const excerpt = firstMeaningfulLine(documentText);

    const drafts = [
      {
        fieldName: "shipmentReference",
        value: reference,
        confidence: 0.93,
        provider: this.name,
        documentType,
        sourceReference: {
          label: "Capsule context",
          excerpt: `Shipment reference supplied as ${reference}`,
        },
        needsReview: false,
        isAcceptedEvidence: true,
        safetyNotes: ["Fixture-based demo result; no legal or customs conclusion."],
      },
      {
        fieldName: "supplierOriginStatement",
        value: "Origin wording appears present but should be checked by a human.",
        confidence: 0.52,
        provider: this.name,
        documentType,
        sourceReference: {
          label: "Document excerpt",
          excerpt,
        },
        needsReview: false,
        isAcceptedEvidence: true,
        safetyNotes: ["AI-like fixture only; source must remain attached."],
      },
    ];

    return normalizeAndValidateExtractedFieldDrafts(drafts);
  }
}

function firstMeaningfulLine(documentText: string): string {
  return (
    documentText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? "No readable excerpt found in source text."
  );
}
