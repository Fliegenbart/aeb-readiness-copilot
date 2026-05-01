import { describe, expect, it } from "vitest";

import type {
  EvidenceCapsule,
  RemediationTask,
} from "@/lib/domain/types";
import { generateEmailDraftForTask } from "@/lib/remediation/email-drafts";

const capsule: EvidenceCapsule = {
  id: "cap-test",
  capsuleNumber: "CAP-2026-0099",
  objectType: "shipment",
  title: "Demo shipment",
  customerName: "Northwind Industrial AB",
  destinationCountry: "Sweden",
  incoterm: "DAP Gothenburg",
  status: "blocked",
  overallReadinessScore: 42,
  createdAt: new Date("2026-04-30T10:00:00.000Z"),
  updatedAt: new Date("2026-04-30T10:00:00.000Z"),
};

function task(overrides: Partial<RemediationTask> = {}): RemediationTask {
  return {
    id: "task-test",
    capsuleId: capsule.id,
    title: "Refresh end-use statement",
    description: "End-use statement is missing or expired.",
    ownerRole: "customer",
    status: "open",
    reasonCode: "END_USE_STATEMENT_EXPIRED_OR_MISSING",
    target: "EXPORT_CONTROLS",
    severity: "blocking",
    dismissedReason: null,
    dueDate: null,
    createdAt: capsule.createdAt,
    updatedAt: capsule.updatedAt,
    ...overrides,
  };
}

describe("generateEmailDraftForTask", () => {
  it("creates a customer end-use statement request with the capsule number", () => {
    const draft = generateEmailDraftForTask(capsule, task());

    expect(draft?.recipientRole).toBe("customer");
    expect(draft?.subject).toContain("CAP-2026-0099");
    expect(draft?.evidenceRequested).toContain("Current end-use statement");
    expect(draft?.body).toContain("CAP-2026-0099");
    expect(draft?.body.toLowerCase()).not.toContain("violation");
  });

  it("creates an engineering request for missing technical parameters", () => {
    const draft = generateEmailDraftForTask(
      capsule,
      task({
        ownerRole: "engineering",
        reasonCode: "MISSING_EXPORT_CONTROL_TECHNICAL_PARAMETER",
      }),
    );

    expect(draft?.recipientRole).toBe("engineering");
    expect(draft?.evidenceRequested).toContain("technical parameter");
  });

  it("creates a supplier request for origin evidence", () => {
    const draft = generateEmailDraftForTask(
      capsule,
      task({
        ownerRole: "supplier",
        reasonCode: "ORIGIN_MISMATCH",
      }),
    );

    expect(draft?.recipientRole).toBe("supplier");
    expect(draft?.evidenceRequested).toContain("origin evidence");
  });

  it("creates an internal logistics correction request for weight mismatches", () => {
    const draft = generateEmailDraftForTask(
      capsule,
      task({
        ownerRole: "logistics",
        reasonCode: "GROSS_WEIGHT_MISMATCH",
      }),
    );

    expect(draft?.recipientRole).toBe("internalCompliance");
    expect(draft?.evidenceRequested).toContain("corrected invoice/packing list");
    expect(draft?.body).toContain("data issue");
  });

  it("creates a broker pause note for corrected invoice issues", () => {
    const draft = generateEmailDraftForTask(
      capsule,
      task({
        ownerRole: "broker",
        reasonCode: "INVOICE_VALUE_MISMATCH",
      }),
    );

    expect(draft?.recipientRole).toBe("broker");
    expect(draft?.evidenceRequested).toContain("corrected invoice");
  });

  it("does not generate a draft for resolved or dismissed tasks", () => {
    expect(
      generateEmailDraftForTask(capsule, task({ status: "resolved" })),
    ).toBeUndefined();
    expect(
      generateEmailDraftForTask(capsule, task({ status: "dismissed" })),
    ).toBeUndefined();
  });
});
