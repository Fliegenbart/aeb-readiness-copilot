import type { EvidenceCapsule } from "@/lib/domain/types";

export const demoEvidenceCapsules: EvidenceCapsule[] = [
  {
    id: "cap_001",
    reference: "EU-DE-4288",
    shipper: "Meyer Industrial GmbH",
    consignee: "Nordline Components AB",
    readinessScore: 76,
    status: "MISSING_EVIDENCE",
    missingEvidence: ["Supplier origin statement"],
    contradictions: [],
    invoiceValue: 18420,
    packingGrossWeightKg: 892,
    erpGrossWeightKg: 892,
  },
  {
    id: "cap_002",
    reference: "EU-DE-4301",
    shipper: "Apex Motion Systems",
    consignee: "Harborline Services Ltd",
    readinessScore: 91,
    status: "AEB_READY",
    missingEvidence: [],
    contradictions: [],
    invoiceValue: 9730,
    packingGrossWeightKg: 228,
    erpGrossWeightKg: 228,
  },
  {
    id: "cap_003",
    reference: "EU-DE-4319",
    shipper: "Keller Technical Parts",
    consignee: "Baltic Plant Operations",
    readinessScore: 58,
    status: "CONTRADICTION",
    missingEvidence: ["Technical datasheet"],
    contradictions: ["Packing list gross weight differs from ERP export"],
    invoiceValue: 26790,
    packingGrossWeightKg: 1420,
    erpGrossWeightKg: 1265,
  },
];

export const sampleTradeDocumentText = `
Commercial Invoice
Invoice Number: INV-2026-4288
Shipper: Meyer Industrial GmbH
Consignee: Nordline Components AB
Value: EUR 18420
Gross Weight: 892 kg
Supplier declaration: origin wording appears present but should be reviewed.
`;
