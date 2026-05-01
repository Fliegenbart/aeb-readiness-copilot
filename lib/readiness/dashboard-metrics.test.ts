import { describe, expect, it } from "vitest";

import type { EvidenceCapsuleWithRelations } from "@/lib/domain/types";
import { calculateDashboardMetrics } from "@/lib/readiness/dashboard-metrics";

const now = new Date("2026-04-30T10:00:00.000Z");

const capsules: EvidenceCapsuleWithRelations[] = [
  {
    id: "one",
    capsuleNumber: "CAP-1",
    objectType: "shipment",
    title: "Ready shipment",
    customerName: "Beta AB",
    destinationCountry: "Sweden",
    incoterm: "DAP Stockholm",
    overallReadinessScore: 94,
    status: "ready",
    createdAt: now,
    updatedAt: now,
    auditEvents: [],
    extractedFields: [],
    missingEvidence: [],
    contradictions: [],
    remediationTasks: [],
    sourceDocuments: [],
    readinessChecks: [
      {
        id: "check-one",
        capsuleId: "one",
        target: "CUSTOMS_BROKER_INTEGRATION",
        status: "ready",
        score: 94,
        summary: "Ready",
        details: {},
      },
    ],
  },
  {
    id: "two",
    capsuleNumber: "CAP-2",
    objectType: "shipment",
    title: "Blocked shipment",
    customerName: "Delta Ltd",
    destinationCountry: "United Kingdom",
    incoterm: "FCA Hamburg",
    overallReadinessScore: 51,
    status: "blocked",
    createdAt: now,
    updatedAt: now,
    auditEvents: [],
    extractedFields: [],
    remediationTasks: [],
    sourceDocuments: [],
    readinessChecks: [],
    missingEvidence: [
      {
        id: "missing-two",
        capsuleId: "two",
        evidenceKey: "technical_datasheet",
        label: "Technical datasheet",
        severity: "blocking",
        requiredForTarget: "EXPORT_CONTROLS",
        suggestedAction: "Request technical datasheet.",
      },
    ],
    contradictions: [
      {
        id: "contra-one",
        capsuleId: "two",
        fieldKey: "gross_weight_kg",
        severity: "warning",
        description: "Gross weight mismatch",
        leftSource: "invoice.pdf page 1",
        leftValue: "150 kg",
        rightSource: "packing.pdf page 1",
        rightValue: "125 kg",
      },
      {
        id: "contra-two",
        capsuleId: "two",
        fieldKey: "incoterm",
        severity: "warning",
        description: "Incoterm mismatch",
        leftSource: "invoice.pdf page 1",
        leftValue: "DAP",
        rightSource: "erp.csv row 4",
        rightValue: "FCA",
      },
    ],
  },
];

describe("calculateDashboardMetrics", () => {
  it("counts readiness dashboard totals from evidence capsules", () => {
    expect(calculateDashboardMetrics(capsules)).toEqual({
      totalEvidenceCapsules: 2,
      readyForBrokerHandover: 1,
      blockedByMissingEvidence: 1,
      dataContradictions: 2,
    });
  });
});
