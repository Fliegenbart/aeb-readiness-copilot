"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { clearUploadedFiles } from "@/lib/storage/local-document-storage";
import { seedEvidenceCapsuleDemoData } from "@/prisma/seed";

export async function resetPitchDemoDataAction() {
  await clearUploadedFiles();
  await seedEvidenceCapsuleDemoData(prisma);
  revalidatePath("/pitch");
  revalidatePath("/demo");
}
