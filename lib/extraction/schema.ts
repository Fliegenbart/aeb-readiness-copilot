import { z } from "zod";

import type { ExtractedFieldDraft } from "@/lib/extraction/types";

export const LOW_CONFIDENCE_THRESHOLD = 0.7;

const legalConclusionPattern =
  /(legalConclusion|customsConclusion|sanctionsDecision|exportControlDecision|tariffClassificationDecision)/i;

const SourceReferenceSchema = z.object({
  label: z.string().min(1),
  excerpt: z.string().min(1),
  page: z.number().int().positive().optional(),
  line: z.number().int().positive().optional(),
});

export const ExtractedFieldDraftSchema = z.object({
  fieldName: z
    .string()
    .min(1)
    .refine((fieldName) => !legalConclusionPattern.test(fieldName), {
      message: "Extraction must not create legal or customs conclusions.",
    }),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.array(z.string()),
    z.null(),
  ]),
  confidence: z.number().min(0).max(1),
  provider: z.enum(["deterministic", "mock-ai", "openai"]),
  documentType: z.enum([
    "commercial-invoice",
    "packing-list",
    "erp-export",
    "technical-datasheet",
    "supplier-evidence",
    "broker-question",
    "unknown",
  ]),
  sourceReference: SourceReferenceSchema,
  needsReview: z.boolean().default(false),
  isAcceptedEvidence: z.boolean().default(false),
  safetyNotes: z.array(z.string()).default([]),
});

const ExtractedFieldDraftsSchema = z.array(ExtractedFieldDraftSchema);

export function normalizeAndValidateExtractedFieldDrafts(
  rawDrafts: unknown,
): ExtractedFieldDraft[] {
  const drafts = ExtractedFieldDraftsSchema.parse(rawDrafts);

  return drafts.map((draft) => {
    const safetyNotes = [...draft.safetyNotes];
    const isLowConfidence = draft.confidence < LOW_CONFIDENCE_THRESHOLD;

    if (
      isLowConfidence &&
      !safetyNotes.includes("Low confidence: human review required.")
    ) {
      safetyNotes.push("Low confidence: human review required.");
    }

    return {
      ...draft,
      needsReview: draft.needsReview || isLowConfidence,
      isAcceptedEvidence: isLowConfidence ? false : draft.isAcceptedEvidence,
      safetyNotes,
    };
  });
}
