"use server";

import type { RemediationTaskStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { recomputeStoredReadiness } from "@/lib/readiness/persistence";
import {
  dismissRemediationTask,
  updateRemediationTaskStatus,
} from "@/lib/remediation/task-service";

export async function recomputeCapsuleReadinessAction(capsuleId: string) {
  await recomputeStoredReadiness(prisma, capsuleId, "demo.user");
  revalidatePath(`/capsules/${capsuleId}`);
  revalidatePath("/demo");
}

export async function updateRemediationTaskStatusAction(
  capsuleId: string,
  taskId: string,
  status: RemediationTaskStatus,
) {
  if (status !== "inProgress" && status !== "resolved") {
    throw new Error("Unsupported remediation task status update.");
  }

  await updateRemediationTaskStatus(prisma, {
    capsuleId,
    taskId,
    status,
    actor: "demo.user",
  });

  revalidatePath(`/capsules/${capsuleId}`);
  revalidatePath("/demo");
}

export async function dismissRemediationTaskAction(
  capsuleId: string,
  taskId: string,
  formData: FormData,
) {
  const dismissedReason = String(formData.get("dismissedReason") ?? "").trim();

  if (!dismissedReason) {
    throw new Error("A dismissal reason is required.");
  }

  await dismissRemediationTask(prisma, {
    capsuleId,
    taskId,
    dismissedReason,
    actor: "demo.user",
  });

  revalidatePath(`/capsules/${capsuleId}`);
  revalidatePath("/demo");
}
