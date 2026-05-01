import type { PrismaClient } from "@prisma/client";

import { clearUploadedFiles } from "@/lib/storage/local-document-storage";
import { seedEvidenceCapsuleDemoData } from "@/prisma/seed";

export async function resetDemoDataForApi(prisma: PrismaClient) {
  await clearUploadedFiles();
  await seedEvidenceCapsuleDemoData(prisma);

  const [capsuleCount, documentCount, taskCount] = await Promise.all([
    prisma.evidenceCapsule.count(),
    prisma.sourceDocument.count(),
    prisma.remediationTask.count(),
  ]);

  return {
    reset: true,
    capsuleCount,
    documentCount,
    taskCount,
  };
}
