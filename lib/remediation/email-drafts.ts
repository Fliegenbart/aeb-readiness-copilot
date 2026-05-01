import type {
  EvidenceCapsule,
  RemediationTask,
} from "@/lib/domain/types";

export type EmailDraftRecipientRole =
  | "customer"
  | "supplier"
  | "engineering"
  | "broker"
  | "internalCompliance";

export type EmailDraft = {
  recipientRole: EmailDraftRecipientRole;
  subject: string;
  body: string;
  relatedTaskId: string;
  evidenceRequested: string;
};

type Template = {
  recipientRole: EmailDraftRecipientRole;
  evidenceRequested: string;
  subject: (capsule: EvidenceCapsule) => string;
  body: (capsule: EvidenceCapsule, task: RemediationTask) => string;
};

const END_USE_REASON_CODES = [
  "END_USE_STATEMENT_EXPIRED",
  "END_USE_STATEMENT_EXPIRING_SOON",
  "END_USE_STATEMENT_EXPIRED_OR_MISSING",
  "INCOMPLETE_END_USER_OR_END_USE",
  "MISSING_RISK_QUESTIONNAIRE",
  "STALE_RISK_QUESTIONNAIRE",
];

const TECHNICAL_REASON_CODES = [
  "MISSING_EXPORT_CONTROL_TECHNICAL_PARAMETER",
  "MISSING_TECHNICAL_DATASHEET",
  "INSUFFICIENT_PRODUCT_ATTRIBUTES",
];

const ORIGIN_REASON_CODES = [
  "MISSING_COUNTRY_OF_ORIGIN",
  "INCOMPLETE_CLASSIFICATION_OR_ORIGIN",
  "ORIGIN_MISMATCH",
  "MISSING_PREFERENTIAL_ORIGIN_EVIDENCE",
];

const LOGISTICS_MISMATCH_REASON_CODES = [
  "BROKER_BLOCKING_WEIGHT_CONTRADICTION",
  "NET_WEIGHT_MISMATCH",
  "GROSS_WEIGHT_MISMATCH",
];

const BROKER_PAUSE_REASON_CODES = [
  "INVOICE_VALUE_MISMATCH",
  "CURRENCY_MISMATCH",
  "DESTINATION_COUNTRY_MISMATCH",
  "BLOCKING_CONTRADICTION",
];

export function generateEmailDraftForTask(
  capsule: EvidenceCapsule,
  task: RemediationTask,
): EmailDraft | undefined {
  if (task.status === "resolved" || task.status === "dismissed") {
    return undefined;
  }

  const template = templateForTask(task);

  if (!template) {
    return undefined;
  }

  return {
    recipientRole: template.recipientRole,
    subject: template.subject(capsule),
    body: template.body(capsule, task),
    relatedTaskId: task.id,
    evidenceRequested: template.evidenceRequested,
  };
}

function templateForTask(task: RemediationTask): Template | undefined {
  const reasonCode = task.reasonCode ?? "";

  if (END_USE_REASON_CODES.includes(reasonCode)) {
    return requestEndUseStatementTemplate;
  }

  if (TECHNICAL_REASON_CODES.includes(reasonCode)) {
    return requestTechnicalParameterTemplate;
  }

  if (ORIGIN_REASON_CODES.includes(reasonCode)) {
    return requestOriginEvidenceTemplate;
  }

  if (LOGISTICS_MISMATCH_REASON_CODES.includes(reasonCode)) {
    return correctInvoicePackingMismatchTemplate;
  }

  if (BROKER_PAUSE_REASON_CODES.includes(reasonCode)) {
    return brokerPauseTemplate;
  }

  return undefined;
}

const requestEndUseStatementTemplate: Template = {
  recipientRole: "customer",
  evidenceRequested: "Current end-use statement",
  subject: (capsule) =>
    `Evidence request for ${capsule.capsuleNumber}: current end-use statement`,
  body: (capsule, task) =>
    [
      "Hello,",
      "",
      `We are preparing the evidence package for ${capsule.capsuleNumber} (${capsule.title}).`,
      "A current end-use statement is needed to complete the readiness check for the AEB-ready payload preview.",
      "",
      "Could you please provide a current signed end-use statement, including the end user and intended end use where available?",
      "",
      `Related data issue: ${task.description}`,
      "",
      "This request is for evidence readiness only and does not make a legal, customs or export-control conclusion.",
      "",
      "Thank you.",
    ].join("\n"),
};

const requestTechnicalParameterTemplate: Template = {
  recipientRole: "engineering",
  evidenceRequested: "Missing technical parameter for export-control readiness",
  subject: (capsule) =>
    `Technical evidence request for ${capsule.capsuleNumber}`,
  body: (capsule, task) =>
    [
      "Hello Engineering team,",
      "",
      `We are preparing the evidence capsule for ${capsule.capsuleNumber} (${capsule.title}).`,
      "A technical parameter is missing from the current evidence set and is needed for an export-control readiness check.",
      "",
      "Could you please provide the missing technical parameter and the source reference, such as a datasheet section, test report or product master note?",
      "",
      `Requested evidence: ${task.description}`,
      "",
      "This is an evidence-readiness request only; no legal or export-control conclusion is being made.",
      "",
      "Thank you.",
    ].join("\n"),
};

const requestOriginEvidenceTemplate: Template = {
  recipientRole: "supplier",
  evidenceRequested: "Supplier origin evidence",
  subject: (capsule) =>
    `Origin evidence request for ${capsule.capsuleNumber}`,
  body: (capsule, task) =>
    [
      "Hello,",
      "",
      `We are preparing the evidence package for ${capsule.capsuleNumber} (${capsule.title}).`,
      "The readiness check found missing or inconsistent origin evidence in the current source data.",
      "",
      "Could you please provide current supplier origin evidence or confirm the correct country of origin with a source reference?",
      "",
      `Related data issue: ${task.description}`,
      "",
      "This request is for evidence readiness only and does not make a customs or preference conclusion.",
      "",
      "Thank you.",
    ].join("\n"),
};

const brokerPauseTemplate: Template = {
  recipientRole: "broker",
  evidenceRequested: "corrected invoice or aligned shipment data",
  subject: (capsule) =>
    `Pause request for ${capsule.capsuleNumber}: corrected invoice pending`,
  body: (capsule, task) =>
    [
      "Hello,",
      "",
      `Please pause work on the handover package for ${capsule.capsuleNumber} (${capsule.title}) until we provide corrected or aligned source data.`,
      "The readiness check identified a data issue in the current evidence set.",
      "",
      `Issue to resolve: ${task.description}`,
      "",
      "We will send an updated AEB-compatible payload preview once the corrected invoice or aligned source evidence is available.",
      "",
      "This is an operational readiness note only and does not make a legal or customs conclusion.",
      "",
      "Thank you.",
    ].join("\n"),
};

const correctInvoicePackingMismatchTemplate: Template = {
  recipientRole: "internalCompliance",
  evidenceRequested: "corrected invoice/packing list weight evidence",
  subject: (capsule) =>
    `Logistics correction request for ${capsule.capsuleNumber}`,
  body: (capsule, task) =>
    [
      "Hello Logistics team,",
      "",
      `The readiness check for ${capsule.capsuleNumber} (${capsule.title}) found an invoice/packing list data issue.`,
      "Please review the commercial invoice and packing list, confirm the correct shipment weight, and provide the corrected document or source reference.",
      "",
      `Issue to resolve: ${task.description}`,
      "",
      "After the corrected evidence is attached, we can recompute readiness and refresh the AEB-ready payload preview.",
      "",
      "This is an operational evidence request only and does not make a customs conclusion.",
      "",
      "Thank you.",
    ].join("\n"),
};
