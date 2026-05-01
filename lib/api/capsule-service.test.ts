import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { resolve } from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  ApiServiceError,
  getCapsuleDetailForApi,
  getPayloadPreviewForApi,
  listCapsulesForApi,
  parseCapsuleListFilters,
  recomputeCapsuleForApi,
} from "@/lib/api/capsule-service";

const testDatabaseUrl = "file:./test-api-capsules.db";
const testDatabasePath = resolve(process.cwd(), "prisma/test-api-capsules.db");
const testDatabaseJournalPath = resolve(
  process.cwd(),
  "prisma/test-api-capsules.db-journal",
);

describe("capsule API service", () => {
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
    const db = requirePrisma(prisma);
    const { seedEvidenceCapsuleDemoData } = await import("@/prisma/seed");
    await seedEvidenceCapsuleDemoData(db);
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

  it("validates list filters", () => {
    expect(() =>
      parseCapsuleListFilters(new URLSearchParams("target=BAD_TARGET")),
    ).toThrow(ApiServiceError);
  });

  it("lists filtered capsules without exposing storage paths", async () => {
    const db = requirePrisma(prisma);

    const result = await listCapsulesForApi(
      db,
      parseCapsuleListFilters(new URLSearchParams("status=blocked")),
    );

    expect(result.capsules.length).toBeGreaterThan(0);
    expect(result.capsules.every((capsule) => capsule.status === "blocked")).toBe(
      true,
    );
    expect(JSON.stringify(result)).not.toContain("mockPath");
    expect(JSON.stringify(result)).not.toContain("/mock/");
  });

  it("returns full detail without exposing filesystem paths", async () => {
    const db = requirePrisma(prisma);

    const detail = await getCapsuleDetailForApi(db, "cap_clean_broker_handover");

    expect(detail.id).toBe("cap_clean_broker_handover");
    expect(detail.sourceDocuments[0]).not.toHaveProperty("mockPath");
    expect(JSON.stringify(detail)).not.toContain("mockPath");
    expect(JSON.stringify(detail)).not.toContain("/mock/");
  });

  it("throws a typed 404 for a missing capsule", async () => {
    const db = requirePrisma(prisma);

    await expect(getCapsuleDetailForApi(db, "missing-capsule")).rejects.toMatchObject({
      code: "CAPSULE_NOT_FOUND",
      status: 404,
    });
  });

  it("throws a typed 400 for an invalid payload target", async () => {
    const db = requirePrisma(prisma);

    await expect(
      getPayloadPreviewForApi(db, "cap_clean_broker_handover", "BAD_TARGET"),
    ).rejects.toMatchObject({
      code: "INVALID_AEB_TARGET",
      status: 400,
    });
  });

  it("returns sanitized mock AEB payload previews", async () => {
    const db = requirePrisma(prisma);

    const preview = await getPayloadPreviewForApi(
      db,
      "cap_clean_broker_handover",
      "CUSTOMS_BROKER_INTEGRATION",
    );

    expect(preview.target).toBe("CUSTOMS_BROKER_INTEGRATION");
    expect(preview.payload).toMatchObject({
      adapter: "mock AEB adapter",
      payloadType: "AEB-compatible payload preview",
    });
    expect(JSON.stringify(preview)).not.toContain("mockPath");
    expect(JSON.stringify(preview)).not.toContain("/mock/");
  });

  it("records an audit event when a payload preview is generated", async () => {
    const db = requirePrisma(prisma);

    await getPayloadPreviewForApi(
      db,
      "cap_clean_broker_handover",
      "CUSTOMS_BROKER_INTEGRATION",
    );

    const event = await db.auditEvent.findFirst({
      where: {
        capsuleId: "cap_clean_broker_handover",
        eventType: "payload.preview.generated",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(event).toMatchObject({
      actor: "mock-aeb-adapter",
      message: expect.stringContaining("AEB-ready payload preview"),
    });
    expect(event?.metadata).toMatchObject({
      target: "CUSTOMS_BROKER_INTEGRATION",
    });
  });

  it("recomputes readiness idempotently enough for demo usage", async () => {
    const db = requirePrisma(prisma);

    await recomputeCapsuleForApi(db, "cap_weight_mismatch");
    await recomputeCapsuleForApi(db, "cap_weight_mismatch");

    const [readinessChecks, activeTasks] = await Promise.all([
      db.readinessCheck.findMany({
        where: { capsuleId: "cap_weight_mismatch" },
      }),
      db.remediationTask.findMany({
        where: {
          capsuleId: "cap_weight_mismatch",
          status: { in: ["open", "inProgress"] },
        },
      }),
    ]);
    const reasonCodes = activeTasks.map((task) => task.reasonCode).filter(Boolean);

    expect(readinessChecks).toHaveLength(8);
    expect(reasonCodes).toHaveLength(new Set(reasonCodes).size);
  });
});

function requirePrisma(prisma: PrismaClient | undefined): PrismaClient {
  if (!prisma) {
    throw new Error("Prisma test client was not initialized.");
  }

  return prisma;
}
