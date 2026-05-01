import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import { resolve } from "node:path";

import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const testDatabaseUrl = "file:./test-seed.db";
const testDatabasePath = resolve(process.cwd(), "prisma/test-seed.db");
const testDatabaseJournalPath = resolve(process.cwd(), "prisma/test-seed.db-journal");

describe("seeded Evidence Capsules", () => {
  let prisma: PrismaClient | undefined;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    execFileSync("npx", ["prisma", "db", "push", "--force-reset", "--skip-generate"], {
      env: { ...process.env, DATABASE_URL: testDatabaseUrl, RUST_LOG: "info" },
      stdio: "ignore",
    });
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
        // The file may already be gone if Prisma failed before creating it.
      }
    }
  });

  it("creates the five demo capsules with related readiness evidence", async () => {
    expect(prisma).toBeDefined();

    if (!prisma) {
      throw new Error("Prisma test client was not initialized.");
    }

    const capsules = await prisma.evidenceCapsule.findMany({
      include: {
        contradictions: true,
        missingEvidence: true,
        readinessChecks: true,
        remediationTasks: true,
        sourceDocuments: true,
      },
      orderBy: { capsuleNumber: "asc" },
    });

    expect(capsules).toHaveLength(5);
    expect(capsules.map((capsule) => capsule.capsuleNumber)).toEqual([
      "CAP-2026-0001",
      "CAP-2026-0002",
      "CAP-2026-0003",
      "CAP-2026-0004",
      "CAP-2026-0005",
    ]);
    expect(capsules[0].status).toBe("ready");
    expect(capsules[1].contradictions).toHaveLength(1);
    expect(capsules[2].missingEvidence[0].evidenceKey).toBe(
      "preferential_origin_statement",
    );
    expect(capsules[4].readinessChecks[0].target).toBe("EXPORT_CONTROLS");
  });

  it("recomputes stored readiness checks and audit events", async () => {
    expect(prisma).toBeDefined();

    if (!prisma) {
      throw new Error("Prisma test client was not initialized.");
    }

    const capsuleId = "cap_missing_export_parameter";
    const { recomputeStoredReadiness } = await import(
      "@/lib/readiness/persistence"
    );

    await prisma.readinessCheck.deleteMany({ where: { capsuleId } });

    const result = await recomputeStoredReadiness(
      prisma,
      capsuleId,
      "vitest",
    );

    expect(result).not.toBeNull();

    const [capsule, readinessChecks, auditEvents] = await Promise.all([
      prisma.evidenceCapsule.findUnique({ where: { id: capsuleId } }),
      prisma.readinessCheck.findMany({ where: { capsuleId } }),
      prisma.auditEvent.findMany({
        where: {
          capsuleId,
          eventType: {
            in: ["documents.analyzed", "readiness.computed", "tasks.created"],
          },
        },
      }),
    ]);

    expect(readinessChecks).toHaveLength(8);
    expect(capsule?.overallReadinessScore).toBe(
      result?.overallReadinessScore,
    );
    expect(capsule?.status).toBe(result?.capsuleStatus);
    expect(auditEvents.map((event) => event.eventType).sort()).toEqual([
      "documents.analyzed",
      "readiness.computed",
      "tasks.created",
    ]);
  });

  it("stores derived blocking contradictions for seeded weight mismatches", async () => {
    expect(prisma).toBeDefined();

    if (!prisma) {
      throw new Error("Prisma test client was not initialized.");
    }

    const capsuleId = "cap_weight_mismatch";
    const { recomputeStoredReadiness } = await import(
      "@/lib/readiness/persistence"
    );

    await recomputeStoredReadiness(prisma, capsuleId, "vitest");

    const contradiction = await prisma.contradiction.findFirst({
      where: { capsuleId, fieldKey: "gross_weight_kg" },
    });
    const capsule = await prisma.evidenceCapsule.findUnique({
      where: { id: capsuleId },
      select: { status: true },
    });

    expect(contradiction).toMatchObject({
      severity: "blocking",
      description: expect.stringContaining("GROSS_WEIGHT_MISMATCH"),
      leftValue: "228 kg",
      rightValue: "282 kg",
    });
    expect(capsule?.status).toBe("blocked");
  });
});
