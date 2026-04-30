import type { EvidenceCapsule } from "@/lib/domain/types";

export type MockAebPayloadPreview = {
  adapter: "mock-aeb-adapter";
  payloadType: "AEB-compatible payload preview";
  shipmentReference: string;
  readinessCheck: {
    score: number;
    status: string;
    missingEvidence: string[];
    contradictions: string[];
  };
  tradeData: {
    shipper: string;
    consignee: string;
    invoiceValue: number;
    grossWeightKg: number;
  };
};

export function createMockAebPayloadPreview(
  capsule: EvidenceCapsule,
): MockAebPayloadPreview {
  return {
    adapter: "mock-aeb-adapter",
    payloadType: "AEB-compatible payload preview",
    shipmentReference: capsule.reference,
    readinessCheck: {
      score: capsule.readinessScore,
      status: capsule.status,
      missingEvidence: capsule.missingEvidence,
      contradictions: capsule.contradictions,
    },
    tradeData: {
      shipper: capsule.shipper,
      consignee: capsule.consignee,
      invoiceValue: capsule.invoiceValue,
      grossWeightKg: capsule.packingGrossWeightKg,
    },
  };
}
