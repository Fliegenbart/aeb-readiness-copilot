import { describe, expect, it } from "vitest";

import {
  ComplianceScreeningAdapter,
  CustomsBrokerIntegrationAdapter,
  CustomsManagementAdapter,
  ExportControlsAdapter,
  ProductClassificationAdapter,
  aebAdapters,
  buildAebPayloadPreview,
} from "@/lib/aeb";
import { AEB_TARGETS } from "@/lib/aeb/helpers";
import { demoEvidenceCapsules } from "@/lib/domain/demo-data";
import type { EvidenceCapsuleWithRelations } from "@/lib/domain/types";

const readyCapsule = demoEvidenceCapsules[0];
const missingExportParameterCapsule = demoEvidenceCapsules[4];

describe("mock AEB adapters", () => {
  it("registers one mock adapter for every AEB target", () => {
    expect(Object.keys(aebAdapters).sort()).toEqual([...AEB_TARGETS].sort());
  });

  it("builds a customs broker handover payload preview from complete seed data", () => {
    const preview = new CustomsBrokerIntegrationAdapter().buildPayload(
      readyCapsule,
    );
    const payload = preview.payload as {
      workflow: string;
      parties: { exporter: { name: string } };
      invoiceSummary: { currency: string };
    };

    expect(preview.target).toBe("CUSTOMS_BROKER_INTEGRATION");
    expect(preview.blockingIssues).toHaveLength(0);
    expect(payload.workflow).toBe("customsBrokerHandover");
    expect(payload.parties.exporter.name).toBe("AeroValve Systems GmbH");
    expect(payload.invoiceSummary.currency).toBe("EUR");
    expect(preview.sourceFieldRefs.map((ref) => ref.fieldKey)).toContain(
      "hs_code",
    );
  });

  it("returns blocking validation issues when customs-management mandatory data is missing", () => {
    const adapter = new CustomsManagementAdapter();
    const preview = adapter.buildPayload(
      withoutFields(readyCapsule, "invoice_value", "currency"),
    );

    expect(preview.readinessStatus).toBe("blocked");
    expect(preview.blockingIssues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "CUSTOMS_MISSING_VALUE",
        "CUSTOMS_MISSING_CURRENCY",
      ]),
    );
    expect(adapter.validatePayload(preview).valid).toBe(false);
  });

  it("includes product classification evidence without making a classification decision", () => {
    const preview = new ProductClassificationAdapter().buildPayload(
      readyCapsule,
    );
    const payload = preview.payload as {
      workflow: string;
      nonGoal: string;
      products: Array<{ existingClassification?: string }>;
    };

    expect(payload.workflow).toBe("productClassification");
    expect(payload.nonGoal).toContain("does not classify");
    expect(payload.products[0].existingClassification).toBe("848180");
  });

  it("blocks export-control preview validation when required technical evidence is missing", () => {
    const preview = new ExportControlsAdapter().buildPayload(
      missingExportParameterCapsule,
    );

    expect(preview.readinessStatus).toBe("blocked");
    expect(preview.blockingIssues.map((issue) => issue.code)).toContain(
      "MISSING_EVIDENCE_SENSOR_SAMPLING_RATE",
    );
    expect(JSON.stringify(preview.payload)).toContain(
      "does not determine export-control status",
    );
  });

  it("builds compliance-screening party data without screening", () => {
    const preview = new ComplianceScreeningAdapter().buildPayload(
      withoutFields(readyCapsule, "end_user_address"),
    );
    const payload = preview.payload as {
      noScreeningPerformed: boolean;
      parties: { endUser: { name: string } };
    };

    expect(payload.noScreeningPerformed).toBe(true);
    expect(payload.parties.endUser.name).toBe("Nordline Components AB");
    expect(preview.blockingIssues).toHaveLength(0);
    expect(preview.warnings.map((issue) => issue.code)).toContain(
      "SCREENING_MISSING_END_USER_ADDRESS",
    );
  });

  it("builds payload previews through the target dispatcher", () => {
    const preview = buildAebPayloadPreview(readyCapsule, "CARRIER_CONNECT");

    expect(preview.target).toBe("CARRIER_CONNECT");
    expect(preview.payload).toMatchObject({
      adapter: "mock AEB adapter",
      payloadType: "AEB-compatible payload preview",
      workflow: "carrierConnect",
    });
  });
});

function withoutFields(
  capsule: EvidenceCapsuleWithRelations,
  ...fieldKeys: string[]
): EvidenceCapsuleWithRelations {
  return {
    ...capsule,
    extractedFields: capsule.extractedFields.filter(
      (field) => !fieldKeys.includes(field.fieldKey),
    ),
  };
}
