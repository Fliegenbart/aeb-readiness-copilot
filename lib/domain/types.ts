export type EvidenceObjectType =
  | "shipment"
  | "material"
  | "customerOrder"
  | "brokerQuestion";

export type EvidenceCapsuleStatus =
  | "draft"
  | "analyzing"
  | "blocked"
  | "warning"
  | "ready";

export type SourceDocumentType =
  | "commercialInvoice"
  | "packingList"
  | "erpExport"
  | "technicalDatasheet"
  | "endUseStatement"
  | "supplierEvidence"
  | "brokerEmail"
  | "other";

export type EvidenceGapSeverity = "info" | "warning" | "blocking";

export type AebTarget =
  | "CUSTOMS_BROKER_INTEGRATION"
  | "CUSTOMS_MANAGEMENT"
  | "PRODUCT_CLASSIFICATION"
  | "EXPORT_CONTROLS"
  | "COMPLIANCE_SCREENING"
  | "LICENSE_MANAGEMENT"
  | "RISK_ASSESSMENT"
  | "CARRIER_CONNECT";

export type ReadinessStatus = "ready" | "warning" | "blocked" | "notApplicable";

export type OwnerRole =
  | "logistics"
  | "tradeCompliance"
  | "sales"
  | "engineering"
  | "purchasing"
  | "broker"
  | "customer"
  | "supplier";

export type RemediationTaskStatus =
  | "open"
  | "inProgress"
  | "resolved"
  | "dismissed";

export type JsonObject = Record<string, unknown>;

export type EvidenceCapsule = {
  id: string;
  capsuleNumber: string;
  objectType: EvidenceObjectType;
  title: string;
  customerName: string;
  destinationCountry: string;
  incoterm: string;
  status: EvidenceCapsuleStatus;
  overallReadinessScore: number;
  createdAt: Date;
  updatedAt: Date;
};

export type SourceDocument = {
  id: string;
  capsuleId: string;
  type: SourceDocumentType;
  filename: string;
  mimeType: string;
  mockPath: string;
  uploadedAt: Date;
};

export type ExtractedField = {
  id: string;
  capsuleId: string;
  sourceDocumentId?: string | null;
  fieldKey: string;
  label: string;
  value: string;
  normalizedValue?: string | null;
  confidence: number;
  sourceRef: string;
  createdAt: Date;
};

export type Contradiction = {
  id: string;
  capsuleId: string;
  fieldKey: string;
  severity: EvidenceGapSeverity;
  description: string;
  leftSource: string;
  leftValue: string;
  rightSource: string;
  rightValue: string;
};

export type MissingEvidence = {
  id: string;
  capsuleId: string;
  evidenceKey: string;
  label: string;
  severity: EvidenceGapSeverity;
  requiredForTarget: AebTarget;
  suggestedAction: string;
};

export type ReadinessCheck = {
  id: string;
  capsuleId: string;
  target: AebTarget;
  status: ReadinessStatus;
  score: number;
  summary: string;
  details: JsonObject;
};

export type RemediationTask = {
  id: string;
  capsuleId: string;
  title: string;
  description: string;
  ownerRole: OwnerRole;
  status: RemediationTaskStatus;
  reasonCode?: string | null;
  target?: AebTarget | null;
  severity?: EvidenceGapSeverity | null;
  dismissedReason?: string | null;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditEvent = {
  id: string;
  capsuleId: string;
  eventType: string;
  message: string;
  actor: string;
  metadata: JsonObject;
  createdAt: Date;
};

export type EvidenceCapsuleWithRelations = EvidenceCapsule & {
  auditEvents: AuditEvent[];
  contradictions: Contradiction[];
  extractedFields: ExtractedField[];
  missingEvidence: MissingEvidence[];
  readinessChecks: ReadinessCheck[];
  remediationTasks: RemediationTask[];
  sourceDocuments: SourceDocument[];
};
