export type ExtractionProviderName = "deterministic" | "mock-ai" | "openai";

export type TradeDocumentType =
  | "commercial-invoice"
  | "packing-list"
  | "erp-export"
  | "technical-datasheet"
  | "supplier-evidence"
  | "broker-question"
  | "unknown";

export type CapsuleContext = {
  capsuleId?: string;
  shipmentReference?: string;
  knownPartNumbers?: string[];
};

export type SourceReference = {
  label: string;
  excerpt: string;
  page?: number;
  line?: number;
};

export type ExtractedFieldDraft = {
  fieldName: string;
  value: string | number | boolean | string[] | null;
  confidence: number;
  provider: ExtractionProviderName;
  documentType: TradeDocumentType;
  sourceReference: SourceReference;
  needsReview: boolean;
  isAcceptedEvidence: boolean;
  safetyNotes: string[];
};

export interface EvidenceExtractionProvider {
  name: ExtractionProviderName;
  extract(
    documentText: string,
    documentType: TradeDocumentType,
    capsuleContext: CapsuleContext,
  ): ExtractedFieldDraft[];
}
