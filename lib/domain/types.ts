export type EvidenceCapsuleStatus =
  | "AEB_READY"
  | "MISSING_EVIDENCE"
  | "CONTRADICTION";

export type EvidenceCapsule = {
  id: string;
  reference: string;
  shipper: string;
  consignee: string;
  readinessScore: number;
  status: EvidenceCapsuleStatus;
  missingEvidence: string[];
  contradictions: string[];
  invoiceValue: number;
  packingGrossWeightKg: number;
  erpGrossWeightKg: number;
};
