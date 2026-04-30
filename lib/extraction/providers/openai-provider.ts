import { normalizeAndValidateExtractedFieldDrafts } from "@/lib/extraction/schema";
import type {
  CapsuleContext,
  EvidenceExtractionProvider,
  ExtractedFieldDraft,
  TradeDocumentType,
} from "@/lib/extraction/types";

export class OpenAIProvider implements EvidenceExtractionProvider {
  name = "openai" as const;

  constructor(private readonly apiKey: string) {}

  extract(
    _documentText: string,
    documentType: TradeDocumentType,
    capsuleContext: CapsuleContext,
  ): ExtractedFieldDraft[] {
    const reference = capsuleContext.shipmentReference ?? "Unspecified shipment";

    // Skeleton only: no external call is made in the MVP.
    return normalizeAndValidateExtractedFieldDrafts([
      {
        fieldName: "openAiProviderStatus",
        value:
          "OpenAI provider skeleton is configured, but live extraction is not implemented in this MVP.",
        confidence: 1,
        provider: this.name,
        documentType,
        sourceReference: {
          label: "Provider configuration",
          excerpt: `OPENAI_API_KEY is present for ${reference}.`,
        },
        needsReview: true,
        isAcceptedEvidence: false,
        safetyNotes: [
          "Skeleton only: no external AI request was made.",
          "Never use this field as a legal or customs conclusion.",
        ],
      },
    ]);
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }
}
