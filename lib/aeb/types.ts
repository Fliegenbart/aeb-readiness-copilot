import type {
  AebTarget,
  EvidenceCapsuleWithRelations,
  JsonObject,
  ReadinessStatus,
} from "@/lib/domain/types";

export type PayloadIssue = {
  code: string;
  message: string;
  fieldKey?: string;
  sourceRef?: string;
};

export type SourceFieldRef = {
  fieldKey: string;
  label: string;
  value: string;
  normalizedValue?: string | null;
  confidence: number;
  sourceRef: string;
  sourceDocumentId?: string | null;
  sourceDocumentFilename?: string;
};

export type AebPayloadPreview = {
  target: AebTarget;
  generatedAt: string;
  capsuleId: string;
  readinessStatus: ReadinessStatus;
  payload: JsonObject;
  warnings: PayloadIssue[];
  blockingIssues: PayloadIssue[];
  sourceFieldRefs: SourceFieldRef[];
};

export type PayloadValidationResult = {
  valid: boolean;
  warnings: PayloadIssue[];
  blockingIssues: PayloadIssue[];
};

export interface AebAdapter {
  target: AebTarget;
  buildPayload(capsule: EvidenceCapsuleWithRelations): AebPayloadPreview;
  validatePayload(payload: AebPayloadPreview): PayloadValidationResult;
}
