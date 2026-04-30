import { describe, expect, it } from "vitest";

import type { EvidenceCapsule } from "@/lib/domain/types";
import { calculateDashboardMetrics } from "@/lib/readiness/dashboard-metrics";

const capsules: EvidenceCapsule[] = [
  {
    id: "one",
    reference: "EU-DE-1",
    shipper: "Alpha GmbH",
    consignee: "Beta AB",
    readinessScore: 94,
    status: "AEB_READY",
    missingEvidence: [],
    contradictions: [],
    invoiceValue: 1000,
    packingGrossWeightKg: 100,
    erpGrossWeightKg: 100,
  },
  {
    id: "two",
    reference: "EU-DE-2",
    shipper: "Gamma GmbH",
    consignee: "Delta Ltd",
    readinessScore: 51,
    status: "CONTRADICTION",
    missingEvidence: ["Technical datasheet"],
    contradictions: ["Gross weight mismatch", "Incoterm mismatch"],
    invoiceValue: 2000,
    packingGrossWeightKg: 150,
    erpGrossWeightKg: 125,
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
