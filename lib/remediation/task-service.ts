import { Prisma, type PrismaClient, type RemediationTaskStatus } from "@prisma/client";

type UpdateTaskStatusInput = {
  capsuleId: string;
  taskId: string;
  status: Extract<RemediationTaskStatus, "inProgress" | "resolved">;
  actor?: string;
};

type DismissTaskInput = {
  capsuleId: string;
  taskId: string;
  dismissedReason: string;
  actor?: string;
};

export async function updateRemediationTaskStatus(
  prisma: PrismaClient,
  input: UpdateTaskStatusInput,
) {
  const task = await prisma.remediationTask.findFirst({
    where: { id: input.taskId, capsuleId: input.capsuleId },
  });

  if (!task) {
    return null;
  }

  await prisma.$transaction([
    prisma.remediationTask.update({
      where: { id: input.taskId },
      data: {
        status: input.status,
        dismissedReason: null,
      },
    }),
    prisma.auditEvent.create({
      data: {
        capsuleId: input.capsuleId,
        eventType:
          input.status === "resolved"
            ? "task.resolved"
            : "task.marked_in_progress",
        message:
          input.status === "resolved"
            ? `Remediation task resolved: ${task.title}.`
            : `Remediation task marked in progress: ${task.title}.`,
        actor: input.actor ?? "demo.user",
        metadata: taskAuditMetadata(task.id, input.status, task.reasonCode),
      },
    }),
  ]);

  return { ...task, status: input.status, dismissedReason: null };
}

export async function resolveRemediationTaskById(
  prisma: PrismaClient,
  taskId: string,
  actor?: string,
) {
  const task = await prisma.remediationTask.findUnique({
    where: { id: taskId },
    select: { capsuleId: true },
  });

  if (!task) {
    return null;
  }

  return updateRemediationTaskStatus(prisma, {
    capsuleId: task.capsuleId,
    taskId,
    status: "resolved",
    actor,
  });
}

export async function dismissRemediationTask(
  prisma: PrismaClient,
  input: DismissTaskInput,
) {
  const dismissedReason = input.dismissedReason.trim();

  if (!dismissedReason) {
    throw new Error("A dismissal reason is required.");
  }

  const task = await prisma.remediationTask.findFirst({
    where: { id: input.taskId, capsuleId: input.capsuleId },
  });

  if (!task) {
    return null;
  }

  await prisma.$transaction([
    prisma.remediationTask.update({
      where: { id: input.taskId },
      data: {
        status: "dismissed",
        dismissedReason,
      },
    }),
    prisma.auditEvent.create({
      data: {
        capsuleId: input.capsuleId,
        eventType: "task.dismissed",
        message: `Remediation task dismissed: ${task.title}.`,
        actor: input.actor ?? "demo.user",
        metadata: {
          ...taskAuditMetadata(task.id, "dismissed", task.reasonCode),
          dismissedReason,
        },
      },
    }),
  ]);

  return { ...task, status: "dismissed" as const, dismissedReason };
}

export async function dismissRemediationTaskById(
  prisma: PrismaClient,
  taskId: string,
  dismissedReason: string,
  actor?: string,
) {
  const task = await prisma.remediationTask.findUnique({
    where: { id: taskId },
    select: { capsuleId: true },
  });

  if (!task) {
    return null;
  }

  return dismissRemediationTask(prisma, {
    capsuleId: task.capsuleId,
    taskId,
    dismissedReason,
    actor,
  });
}

function taskAuditMetadata(
  taskId: string,
  status: RemediationTaskStatus,
  reasonCode: string | null,
): Prisma.InputJsonObject {
  return {
    taskId,
    status,
    reasonCode,
  };
}
