import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { resolve } from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  dismissRemediationTaskById,
  dismissRemediationTask,
  resolveRemediationTaskById,
  updateRemediationTaskStatus,
} from "@/lib/remediation/task-service";

const testDatabaseUrl = "file:./test-remediation-tasks.db";
const testDatabasePath = resolve(
  process.cwd(),
  "prisma/test-remediation-tasks.db",
);
const testDatabaseJournalPath = resolve(
  process.cwd(),
  "prisma/test-remediation-tasks.db-journal",
);

describe("remediation task service", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execFileSync(
      "npx",
      ["prisma", "db", "push", "--force-reset", "--skip-generate"],
      {
        env: { ...process.env, DATABASE_URL: testDatabaseUrl, RUST_LOG: "info" },
        stdio: "ignore",
      },
    );
    execFileSync("npx", ["prisma", "generate"], {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl },
      stdio: "ignore",
    });
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient();
  });

  beforeEach(async () => {
    expect(prisma).toBeDefined();

    if (!prisma) {
      throw new Error("Prisma test client was not initialized.");
    }

    const { seedEvidenceCapsuleDemoData } = await import("@/prisma/seed");
    await seedEvidenceCapsuleDemoData(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();

    for (const path of [testDatabasePath, testDatabaseJournalPath]) {
      try {
        unlinkSync(path);
      } catch {
        // Test database file may not exist if setup failed early.
      }
    }
  });

  it("marks a remediation task in progress and writes an audit event", async () => {
    const db = requirePrisma(prisma);

    await updateRemediationTaskStatus(db, {
      capsuleId: "cap_weight_mismatch",
      taskId: "task_0002_weight",
      status: "inProgress",
      actor: "vitest",
    });

    const [task, event] = await Promise.all([
      db.remediationTask.findUnique({ where: { id: "task_0002_weight" } }),
      db.auditEvent.findFirst({
        where: {
          capsuleId: "cap_weight_mismatch",
          eventType: "task.marked_in_progress",
        },
      }),
    ]);

    expect(task?.status).toBe("inProgress");
    expect(event).toMatchObject({
      actor: "vitest",
      message: expect.stringContaining("marked in progress"),
    });
  });

  it("marks a remediation task resolved and writes an audit event", async () => {
    const db = requirePrisma(prisma);

    await updateRemediationTaskStatus(db, {
      capsuleId: "cap_weight_mismatch",
      taskId: "task_0002_weight",
      status: "resolved",
      actor: "vitest",
    });

    const [task, event] = await Promise.all([
      db.remediationTask.findUnique({ where: { id: "task_0002_weight" } }),
      db.auditEvent.findFirst({
        where: {
          capsuleId: "cap_weight_mismatch",
          eventType: "task.resolved",
        },
      }),
    ]);

    expect(task?.status).toBe("resolved");
    expect(event).toMatchObject({
      actor: "vitest",
      message: expect.stringContaining("resolved"),
    });
  });

  it("dismisses a remediation task with a reason and writes an audit event", async () => {
    const db = requirePrisma(prisma);

    await dismissRemediationTask(db, {
      capsuleId: "cap_weight_mismatch",
      taskId: "task_0002_weight",
      dismissedReason: "Duplicate task for demo review.",
      actor: "vitest",
    });

    const [task, event] = await Promise.all([
      db.remediationTask.findUnique({ where: { id: "task_0002_weight" } }),
      db.auditEvent.findFirst({
        where: {
          capsuleId: "cap_weight_mismatch",
          eventType: "task.dismissed",
        },
      }),
    ]);

    expect(task).toMatchObject({
      status: "dismissed",
      dismissedReason: "Duplicate task for demo review.",
    });
    expect(event).toMatchObject({
      actor: "vitest",
      message: expect.stringContaining("dismissed"),
    });
  });

  it("resolves and dismisses tasks by task id for API routes", async () => {
    const db = requirePrisma(prisma);

    await resolveRemediationTaskById(db, "task_0002_weight", "vitest-api");
    await dismissRemediationTaskById(
      db,
      "task_0003_origin",
      "Handled outside the demo flow.",
      "vitest-api",
    );

    const [resolvedTask, dismissedTask] = await Promise.all([
      db.remediationTask.findUnique({ where: { id: "task_0002_weight" } }),
      db.remediationTask.findUnique({ where: { id: "task_0003_origin" } }),
    ]);

    expect(resolvedTask?.status).toBe("resolved");
    expect(dismissedTask).toMatchObject({
      status: "dismissed",
      dismissedReason: "Handled outside the demo flow.",
    });
  });
});

function requirePrisma(prisma: PrismaClient | undefined): PrismaClient {
  if (!prisma) {
    throw new Error("Prisma test client was not initialized.");
  }

  return prisma;
}
