import { Prisma, PrismaClient } from "@prisma/client";

import { demoEvidenceCapsules } from "../lib/domain/demo-data";

type SeedPrismaClient = PrismaClient;

export async function seedEvidenceCapsuleDemoData(prisma: SeedPrismaClient) {
  await prisma.auditEvent.deleteMany();
  await prisma.remediationTask.deleteMany();
  await prisma.readinessCheck.deleteMany();
  await prisma.missingEvidence.deleteMany();
  await prisma.contradiction.deleteMany();
  await prisma.extractedField.deleteMany();
  await prisma.sourceDocument.deleteMany();
  await prisma.evidenceCapsule.deleteMany();

  for (const capsule of demoEvidenceCapsules) {
    await prisma.evidenceCapsule.create({
      data: {
        id: capsule.id,
        capsuleNumber: capsule.capsuleNumber,
        objectType: capsule.objectType,
        title: capsule.title,
        customerName: capsule.customerName,
        destinationCountry: capsule.destinationCountry,
        incoterm: capsule.incoterm,
        status: capsule.status,
        overallReadinessScore: capsule.overallReadinessScore,
        createdAt: capsule.createdAt,
        updatedAt: capsule.updatedAt,
      },
    });

    for (const document of capsule.sourceDocuments) {
      await prisma.sourceDocument.create({
        data: {
          id: document.id,
          capsuleId: document.capsuleId,
          type: document.type,
          filename: document.filename,
          mimeType: document.mimeType,
          mockPath: document.mockPath,
          uploadedAt: document.uploadedAt,
        },
      });
    }

    for (const field of capsule.extractedFields) {
      await prisma.extractedField.create({
        data: {
          id: field.id,
          capsuleId: field.capsuleId,
          sourceDocumentId: field.sourceDocumentId,
          fieldKey: field.fieldKey,
          label: field.label,
          value: field.value,
          normalizedValue: field.normalizedValue,
          confidence: field.confidence,
          sourceRef: field.sourceRef,
          createdAt: field.createdAt,
        },
      });
    }

    for (const contradiction of capsule.contradictions) {
      await prisma.contradiction.create({
        data: contradiction,
      });
    }

    for (const missingEvidence of capsule.missingEvidence) {
      await prisma.missingEvidence.create({
        data: missingEvidence,
      });
    }

    for (const readinessCheck of capsule.readinessChecks) {
      await prisma.readinessCheck.create({
        data: {
          ...readinessCheck,
          details: readinessCheck.details as Prisma.InputJsonObject,
        },
      });
    }

    for (const task of capsule.remediationTasks) {
      await prisma.remediationTask.create({
        data: task,
      });
    }

    for (const event of capsule.auditEvents) {
      await prisma.auditEvent.create({
        data: {
          ...event,
          metadata: event.metadata as Prisma.InputJsonObject,
        },
      });
    }
  }
}

async function main() {
  const prisma = new PrismaClient();

  try {
    await seedEvidenceCapsuleDemoData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
