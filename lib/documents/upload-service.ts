import { Prisma, type PrismaClient, type SourceDocumentType } from "@prisma/client";

import {
  detectWeightContradictions,
  extractFieldsFromDocument,
  shouldResolveMissingEvidence,
  type ExtractedFieldDraft,
  type WeightContradictionSourceField,
} from "@/lib/extraction/document-service";
import { recomputeStoredReadiness } from "@/lib/readiness/persistence";
import { storeUploadedFile } from "@/lib/storage/local-document-storage";

export type UploadSourceDocumentInput = {
  capsuleId: string;
  file: File;
  documentType: SourceDocumentType;
};

export type UploadSourceDocumentResult = {
  sourceDocumentId: string;
  filename: string;
  extractedFieldCount: number;
  contradictionCount: number;
  resolvedMissingEvidenceCount: number;
};

export const MAX_DEMO_UPLOAD_BYTES = 10 * 1024 * 1024;

const supportedExtensions = [".pdf", ".csv", ".xlsx", ".txt"];

export async function uploadSourceDocument(
  prisma: PrismaClient,
  input: UploadSourceDocumentInput,
): Promise<UploadSourceDocumentResult> {
  const capsule = await prisma.evidenceCapsule.findUnique({
    where: { id: input.capsuleId },
    select: { id: true },
  });

  if (!capsule) {
    throw new UploadDocumentError("CAPSULE_NOT_FOUND", "Evidence Capsule not found.");
  }

  validateDemoUploadFile(input.file);

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const storedFile = await storeUploadedFile({
    capsuleId: input.capsuleId,
    filename: input.file.name,
    mimeType: input.file.type || mimeTypeFromFilename(input.file.name),
    buffer,
  });

  const sourceDocument = await prisma.sourceDocument.create({
    data: {
      capsuleId: input.capsuleId,
      type: input.documentType,
      filename: storedFile.filename,
      mimeType: storedFile.mimeType,
      mockPath: storedFile.relativePath,
    },
  });

  const extractedFields = extractFieldsFromDocument({
    documentType: input.documentType,
    filename: storedFile.filename,
    mimeType: storedFile.mimeType,
    content: storedFile.buffer,
  });

  if (extractedFields.length > 0) {
    await prisma.extractedField.createMany({
      data: extractedFields.map((field) => ({
        capsuleId: input.capsuleId,
        sourceDocumentId: sourceDocument.id,
        fieldKey: field.fieldKey,
        label: field.label,
        value: field.value,
        normalizedValue: field.normalizedValue,
        confidence: field.confidence,
        sourceRef: field.sourceRef,
      })),
    });
  }

  const derived = await refreshDerivedEvidence(
    prisma,
    input.capsuleId,
    extractedFields,
  );

  await prisma.auditEvent.createMany({
    data: [
      {
        capsuleId: input.capsuleId,
        eventType: "document.uploaded",
        message: `${storedFile.filename} uploaded as ${input.documentType}.`,
        actor: "demo.user",
        metadata: {
          filename: storedFile.filename,
          mimeType: storedFile.mimeType,
          size: storedFile.size,
        } as Prisma.InputJsonObject,
      },
      {
        capsuleId: input.capsuleId,
        eventType: "document.extracted",
        message: `${extractedFields.length} extracted fields created from ${storedFile.filename}.`,
        actor: "deterministic.upload.extractor",
        metadata: {
          sourceDocumentId: sourceDocument.id,
          extractedFieldCount: extractedFields.length,
          resolvedMissingEvidenceCount: derived.resolvedMissingEvidenceCount,
          contradictionCount: derived.contradictionCount,
        } as Prisma.InputJsonObject,
      },
    ],
  });

  await recomputeStoredReadiness(prisma, input.capsuleId, "upload.flow");

  return {
    sourceDocumentId: sourceDocument.id,
    filename: storedFile.filename,
    extractedFieldCount: extractedFields.length,
    contradictionCount: derived.contradictionCount,
    resolvedMissingEvidenceCount: derived.resolvedMissingEvidenceCount,
  };
}

export class UploadDocumentError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

async function refreshDerivedEvidence(
  prisma: PrismaClient,
  capsuleId: string,
  newDrafts: ExtractedFieldDraft[],
) {
  const fields = await prisma.extractedField.findMany({
    where: { capsuleId },
    include: {
      sourceDocument: {
        select: {
          type: true,
          filename: true,
        },
      },
    },
  });

  const contradictions = detectWeightContradictions(
    fields.map(
      (field): WeightContradictionSourceField => ({
        fieldKey: field.fieldKey,
        value: field.value,
        normalizedValue: field.normalizedValue,
        sourceRef: field.sourceRef,
        sourceDocument: field.sourceDocument,
      }),
    ),
  );

  await prisma.contradiction.deleteMany({
    where: {
      capsuleId,
      fieldKey: { in: ["gross_weight_kg", "net_weight_kg"] },
    },
  });

  if (contradictions.length > 0) {
    await prisma.contradiction.createMany({
      data: contradictions.map((contradiction) => ({
        capsuleId,
        ...contradiction,
      })),
    });
  }

  const missingEvidence = await prisma.missingEvidence.findMany({
    where: { capsuleId },
  });
  const resolvableEvidenceKeys = missingEvidence
    .filter((item) => shouldResolveMissingEvidence(item.evidenceKey, newDrafts))
    .map((item) => item.evidenceKey);

  if (resolvableEvidenceKeys.length > 0) {
    await prisma.missingEvidence.deleteMany({
      where: {
        capsuleId,
        evidenceKey: { in: resolvableEvidenceKeys },
      },
    });
  }

  return {
    contradictionCount: contradictions.length,
    resolvedMissingEvidenceCount: resolvableEvidenceKeys.length,
  };
}

export function validateDemoUploadFile(file: Pick<File, "name" | "size">) {
  const lowerName = file.name.toLowerCase();

  if (!supportedExtensions.some((extension) => lowerName.endsWith(extension))) {
    throw new UploadDocumentError(
      "UNSUPPORTED_FILE_TYPE",
      "Only PDF, CSV, XLSX and TXT uploads are supported in this demo.",
    );
  }

  if (file.size === 0) {
    throw new UploadDocumentError("EMPTY_FILE", "Uploaded file is empty.");
  }

  if (file.size > MAX_DEMO_UPLOAD_BYTES) {
    throw new UploadDocumentError(
      "FILE_TOO_LARGE",
      "Uploaded file is too large for the demo. The maximum size is 10 MB.",
      413,
    );
  }
}

function mimeTypeFromFilename(filename: string): string {
  const lowerName = filename.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    return "text/csv";
  }

  if (lowerName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  if (lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }

  return "text/plain";
}
