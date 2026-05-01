import { describe, expect, it } from "vitest";

import { demoEvidenceCapsules } from "@/lib/domain/demo-data";
import { buildPitchDemoFlow } from "@/lib/pitch/demo-flow";

describe("buildPitchDemoFlow", () => {
  it("builds the five-step partner demo from seeded Evidence Capsules", () => {
    const flow = buildPitchDemoFlow(demoEvidenceCapsules);

    expect(flow.steps.map((step) => step.title)).toEqual([
      "Messy intake",
      "Evidence Capsule",
      "Readiness Matrix",
      "Exception Resolution",
      "AEB-ready payload preview",
    ]);
    expect(flow.positioningCopy).toContain("designed for AEB-adjacent workflows");
    expect(flow.positioningCopy).not.toMatch(/official\s+aeb\s+partner/i);
  });

  it("includes every required mock source document type", () => {
    const flow = buildPitchDemoFlow(demoEvidenceCapsules);

    expect(flow.sourceDocuments.map((document) => document.type)).toEqual([
      "commercialInvoice",
      "packingList",
      "erpExport",
      "endUseStatement",
      "technicalDatasheet",
      "brokerEmail",
    ]);
  });

  it("shows ready, warning and blocked readiness states", () => {
    const flow = buildPitchDemoFlow(demoEvidenceCapsules);

    expect(flow.readinessRows.map((row) => row.status)).toEqual(
      expect.arrayContaining(["ready", "warning", "blocked"]),
    );
  });

  it("surfaces exceptions and generated remediation tasks", () => {
    const flow = buildPitchDemoFlow(demoEvidenceCapsules);

    expect(flow.exceptions.contradictions.length).toBeGreaterThan(0);
    expect(flow.exceptions.missingEvidence.length).toBeGreaterThan(0);
    expect(flow.exceptions.tasks.length).toBeGreaterThan(0);
  });

  it("creates a mock AEB-compatible payload preview", () => {
    const flow = buildPitchDemoFlow(demoEvidenceCapsules);

    expect(flow.payloadPreview.payload.adapter).toBe("mock AEB adapter");
    expect(flow.payloadPreview.payload.payloadType).toBe(
      "AEB-compatible payload preview",
    );
    expect(flow.payloadPreview.target).toBe("CUSTOMS_BROKER_INTEGRATION");
  });
});
