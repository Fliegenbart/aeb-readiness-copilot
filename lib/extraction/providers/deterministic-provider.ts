import {
  normalizeAndValidateExtractedFieldDrafts,
} from "@/lib/extraction/schema";
import type {
  CapsuleContext,
  EvidenceExtractionProvider,
  ExtractedFieldDraft,
  TradeDocumentType,
} from "@/lib/extraction/types";

type DeterministicRule = {
  fieldName: string;
  confidence: number;
  patterns: RegExp[];
};

const rules: DeterministicRule[] = [
  {
    fieldName: "invoiceNumber",
    confidence: 0.95,
    patterns: [/invoice\s*(?:number|no\.?)\s*[:#-]?\s*([A-Z0-9-]+)/i],
  },
  {
    fieldName: "invoiceValue",
    confidence: 0.9,
    patterns: [/(?:invoice\s*)?value\s*[:#-]?\s*(?:EUR|USD|GBP)?\s*([0-9,.]+)/i],
  },
  {
    fieldName: "grossWeightKg",
    confidence: 0.88,
    patterns: [/gross\s*weight\s*[:#-]?\s*([0-9,.]+)\s*kg/i],
  },
  {
    fieldName: "shipper",
    confidence: 0.86,
    patterns: [/shipper\s*[:#-]?\s*(.+)$/i],
  },
  {
    fieldName: "consignee",
    confidence: 0.86,
    patterns: [/consignee\s*[:#-]?\s*(.+)$/i],
  },
];

export class DeterministicProvider implements EvidenceExtractionProvider {
  name = "deterministic" as const;

  extract(
    documentText: string,
    documentType: TradeDocumentType,
    _capsuleContext: CapsuleContext,
  ): ExtractedFieldDraft[] {
    const lines = documentText
      .split(/\r?\n/)
      .map((line, index) => ({ text: line.trim(), line: index + 1 }))
      .filter((line) => line.text.length > 0);

    const drafts = rules.flatMap((rule) => {
      for (const line of lines) {
        for (const pattern of rule.patterns) {
          const match = line.text.match(pattern);

          if (match?.[1]) {
            return [
              {
                fieldName: rule.fieldName,
                value: normalizeValue(match[1]),
                confidence: rule.confidence,
                provider: this.name,
                documentType,
                sourceReference: {
                  label: `Line ${line.line}`,
                  excerpt: line.text,
                  line: line.line,
                },
                needsReview: false,
                isAcceptedEvidence: true,
                safetyNotes: [
                  "Deterministic extraction only; no legal or customs conclusion.",
                ],
              },
            ];
          }
        }
      }

      return [];
    });

    return normalizeAndValidateExtractedFieldDrafts(drafts);
  }
}

function normalizeValue(value: string): string | number {
  const trimmed = value.trim();
  const numeric = Number(trimmed.replaceAll(",", ""));

  return Number.isFinite(numeric) && /[0-9]/.test(trimmed) ? numeric : trimmed;
}
