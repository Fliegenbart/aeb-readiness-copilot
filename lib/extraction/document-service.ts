import { unzipSync } from "fflate";

import type {
  EvidenceGapSeverity,
  SourceDocumentType,
} from "@/lib/domain/types";

export type ExtractedFieldDraft = {
  fieldKey: string;
  label: string;
  value: string;
  normalizedValue?: string | null;
  confidence: number;
  sourceRef: string;
};

export type DocumentExtractionInput = {
  documentType: SourceDocumentType;
  filename: string;
  mimeType: string;
  content: Buffer;
};

export type WeightContradictionSourceField = {
  fieldKey: string;
  value: string;
  normalizedValue?: string | null;
  sourceRef: string;
  sourceDocument?: {
    type: SourceDocumentType;
    filename: string;
  } | null;
};

export type ContradictionDraft = {
  fieldKey: string;
  severity: EvidenceGapSeverity;
  description: string;
  leftSource: string;
  leftValue: string;
  rightSource: string;
  rightValue: string;
};

type KeyValueEntry = {
  key: string;
  value: string;
  line: number;
  raw: string;
};

const CURRENT_DATE = new Date("2026-04-30T00:00:00.000Z");

const columnMap: Record<string, { fieldKey: string; label: string }> = {
  invoice_number: { fieldKey: "invoice_number", label: "Invoice number" },
  invoice_no: { fieldKey: "invoice_number", label: "Invoice number" },
  invoice_value: { fieldKey: "invoice_value", label: "Invoice value" },
  value: { fieldKey: "invoice_value", label: "Invoice value" },
  currency: { fieldKey: "currency", label: "Currency" },
  exporter: { fieldKey: "exporter", label: "Exporter" },
  exporter_address: { fieldKey: "exporter_address", label: "Exporter address" },
  consignee: { fieldKey: "consignee", label: "Consignee" },
  consignee_address: {
    fieldKey: "consignee_address",
    label: "Consignee address",
  },
  destination_country: {
    fieldKey: "destination_country",
    label: "Destination country",
  },
  line_item_count: { fieldKey: "line_item_count", label: "Line items" },
  line_items: { fieldKey: "line_item_count", label: "Line items" },
  hs_code: { fieldKey: "hs_code", label: "HS code" },
  commodity_code: { fieldKey: "hs_code", label: "HS code" },
  country_of_origin: {
    fieldKey: "country_of_origin",
    label: "Country of origin",
  },
  origin_country: { fieldKey: "country_of_origin", label: "Country of origin" },
  product_description: {
    fieldKey: "product_description",
    label: "Product description",
  },
  gross_weight_kg: { fieldKey: "gross_weight_kg", label: "Gross weight" },
  gross_weight: { fieldKey: "gross_weight_kg", label: "Gross weight" },
  net_weight_kg: { fieldKey: "net_weight_kg", label: "Net weight" },
  net_weight: { fieldKey: "net_weight_kg", label: "Net weight" },
  package_count: { fieldKey: "package_count", label: "Package count" },
  packages: { fieldKey: "package_count", label: "Package count" },
  dimensions: { fieldKey: "dimensions", label: "Dimensions" },
};

const textKeyMap: Record<string, { fieldKey: string; label: string }> = {
  end_user: { fieldKey: "end_user", label: "End user" },
  end_user_address: { fieldKey: "end_user_address", label: "End user address" },
  end_use: { fieldKey: "end_use", label: "End use" },
  valid_until: {
    fieldKey: "end_use_statement_expiry",
    label: "End-use statement expiry",
  },
  expiry_date: {
    fieldKey: "end_use_statement_expiry",
    label: "End-use statement expiry",
  },
  end_use_statement_status: {
    fieldKey: "end_use_statement_status",
    label: "End-use statement status",
  },
  risk_questionnaire_date: {
    fieldKey: "risk_questionnaire_date",
    label: "Risk questionnaire date",
  },
  risk_questionnaire_status: {
    fieldKey: "risk_questionnaire_status",
    label: "Risk questionnaire status",
  },
  product_description: {
    fieldKey: "product_description",
    label: "Product description",
  },
  product_attributes: {
    fieldKey: "product_attributes",
    label: "Product attributes",
  },
  technical_attributes: {
    fieldKey: "technical_attributes",
    label: "Technical attributes",
  },
  technical_parameters_complete: {
    fieldKey: "technical_parameters_complete",
    label: "Technical parameters complete",
  },
  operating_temperature_range: {
    fieldKey: "operating_temperature_range",
    label: "Operating temperature range",
  },
  sampling_rate: {
    fieldKey: "sensor_sampling_rate",
    label: "Sensor sampling rate",
  },
  sensor_sampling_rate: {
    fieldKey: "sensor_sampling_rate",
    label: "Sensor sampling rate",
  },
};

export function extractFieldsFromDocument(
  document: DocumentExtractionInput,
): ExtractedFieldDraft[] {
  if (isPdf(document)) {
    return [];
  }

  if (isSpreadsheet(document)) {
    const rows = isXlsx(document)
      ? parseXlsxRows(document.content)
      : parseCsvRows(document.content.toString("utf8"));

    return extractTabularFields(document, rows);
  }

  if (isText(document)) {
    return extractTextFields(document);
  }

  return [];
}

export function detectWeightContradictions(
  fields: WeightContradictionSourceField[],
): ContradictionDraft[] {
  return ["gross_weight_kg", "net_weight_kg"].flatMap((fieldKey) => {
    const invoiceField = fields.find(
      (field) =>
        field.fieldKey === fieldKey &&
        field.sourceDocument?.type === "commercialInvoice",
    );
    const packingField = fields.find(
      (field) =>
        field.fieldKey === fieldKey && field.sourceDocument?.type === "packingList",
    );

    if (!invoiceField || !packingField) {
      return [];
    }

    const invoiceValue = numericValue(invoiceField.normalizedValue ?? invoiceField.value);
    const packingValue = numericValue(packingField.normalizedValue ?? packingField.value);

    if (invoiceValue === undefined || packingValue === undefined) {
      return [];
    }

    if (Math.abs(invoiceValue - packingValue) < 0.001) {
      return [];
    }

    return [
      {
        fieldKey,
        severity: "blocking" as const,
        description: `${labelForField(fieldKey)} differs between commercial invoice and packing list.`,
        leftSource: invoiceField.sourceRef,
        leftValue: invoiceField.value,
        rightSource: packingField.sourceRef,
        rightValue: packingField.value,
      },
    ];
  });
}

export function shouldResolveMissingEvidence(
  evidenceKey: string,
  drafts: ExtractedFieldDraft[],
): boolean {
  if (evidenceKey === "current_end_use_statement") {
    return (
      hasDraftValue(drafts, "end_user") &&
      hasDraftValue(drafts, "end_use") &&
      (draftValue(drafts, "end_use_statement_status") === "current" ||
        futureOrToday(draftValue(drafts, "end_use_statement_expiry")))
    );
  }

  if (evidenceKey === "preferential_origin_statement") {
    return (
      hasDraftValue(drafts, "origin_evidence") ||
      hasDraftValue(drafts, "country_of_origin")
    );
  }

  if (evidenceKey === "sensor_sampling_rate") {
    return (
      hasDraftValue(drafts, "sensor_sampling_rate") ||
      draftValue(drafts, "technical_parameters_complete") === "true"
    );
  }

  return false;
}

function extractTabularFields(
  document: DocumentExtractionInput,
  rows: Array<Record<string, string>>,
): ExtractedFieldDraft[] {
  const allowedFields = allowedTabularFields(document.documentType);

  return rows.flatMap((row, rowIndex) =>
    Object.entries(row).flatMap(([columnKey, value]) => {
      const mapped = columnMap[normalizeKey(columnKey)];

      if (!mapped || !allowedFields.has(mapped.fieldKey) || !isPresent(value)) {
        return [];
      }

      return [
        {
          fieldKey: mapped.fieldKey,
          label: mapped.label,
          value: value.trim(),
          normalizedValue: normalizeFieldValue(mapped.fieldKey, value),
          confidence: 0.94,
          sourceRef: `${document.filename} row ${rowIndex + 2}`,
        },
      ];
    }),
  );
}

function extractTextFields(
  document: DocumentExtractionInput,
): ExtractedFieldDraft[] {
  const entries = parseKeyValueLines(document.content.toString("utf8"));
  const allowedFields = allowedTextFields(document.documentType);
  const drafts = entries.flatMap((entry) => {
    const mapped = textKeyMap[normalizeKey(entry.key)];

    if (!mapped || !allowedFields.has(mapped.fieldKey) || !isPresent(entry.value)) {
      return [];
    }

    return [
      {
        fieldKey: mapped.fieldKey,
        label: mapped.label,
        value: entry.value,
        normalizedValue: normalizeFieldValue(mapped.fieldKey, entry.value),
        confidence: 0.92,
        sourceRef: `${document.filename} line ${entry.line}`,
      },
    ];
  });

  const expiry = drafts.find(
    (draft) => draft.fieldKey === "end_use_statement_expiry",
  );

  if (
    document.documentType === "endUseStatement" &&
    expiry &&
    !drafts.some((draft) => draft.fieldKey === "end_use_statement_status")
  ) {
    drafts.push({
      fieldKey: "end_use_statement_status",
      label: "End-use statement status",
      value: futureOrToday(expiry.normalizedValue ?? expiry.value)
        ? "current"
        : "expired",
      normalizedValue: futureOrToday(expiry.normalizedValue ?? expiry.value)
        ? "current"
        : "expired",
      confidence: 0.9,
      sourceRef: expiry.sourceRef,
    });
  }

  return drafts;
}

function parseCsvRows(content: string): Array<Record<string, string>> {
  const rows = parseCsv(content).filter((row) =>
    row.some((cell) => cell.trim().length > 0),
  );
  const [headers, ...dataRows] = rows;

  if (!headers) {
    return [];
  }

  return dataRows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [normalizeKey(header), row[index] ?? ""]),
    ),
  );
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  rows.push(row);

  return rows;
}

function parseXlsxRows(buffer: Buffer): Array<Record<string, string>> {
  const files = unzipSync(new Uint8Array(buffer));
  const decoder = new TextDecoder();
  const sheetXml = files["xl/worksheets/sheet1.xml"];

  if (!sheetXml) {
    return [];
  }

  const sharedStrings = parseSharedStrings(
    files["xl/sharedStrings.xml"]
      ? decoder.decode(files["xl/sharedStrings.xml"])
      : "",
  );
  const rows = parseSheetXml(decoder.decode(sheetXml), sharedStrings);
  const [headers, ...dataRows] = rows;

  if (!headers) {
    return [];
  }

  return dataRows.map((row) =>
    Object.fromEntries(
      headers.map((header, index) => [normalizeKey(header), row[index] ?? ""]),
    ),
  );
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml(
      [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((textMatch) => textMatch[1])
        .join(""),
    ),
  );
}

function parseSheetXml(xml: string, sharedStrings: string[]): string[][] {
  return [...xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row: string[] = [];

    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attributes = cellMatch[1];
      const body = cellMatch[2];
      const reference = attributes.match(/\br="([A-Z]+)[0-9]+"/)?.[1];
      const type = attributes.match(/\bt="([^"]+)"/)?.[1];
      const columnIndex = reference ? columnLettersToIndex(reference) : row.length;
      const rawValue =
        body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ??
        body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ??
        "";
      const value =
        type === "s" ? sharedStrings[Number(rawValue)] ?? "" : decodeXml(rawValue);

      row[columnIndex] = value;
    }

    return row.map((cell) => cell ?? "");
  });
}

function parseKeyValueLines(content: string): KeyValueEntry[] {
  return content
    .split(/\r?\n/)
    .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
    .flatMap(({ raw, line }) => {
      const separatorIndex = raw.search(/[:=]/);

      if (separatorIndex < 1) {
        return [];
      }

      return [
        {
          raw,
          line,
          key: raw.slice(0, separatorIndex).trim(),
          value: raw.slice(separatorIndex + 1).trim(),
        },
      ];
    });
}

function allowedTabularFields(documentType: SourceDocumentType): Set<string> {
  if (documentType === "packingList") {
    return new Set([
      "gross_weight_kg",
      "net_weight_kg",
      "package_count",
      "dimensions",
    ]);
  }

  if (documentType === "commercialInvoice" || documentType === "erpExport") {
    return new Set([
      "invoice_number",
      "invoice_value",
      "currency",
      "exporter",
      "exporter_address",
      "consignee",
      "consignee_address",
      "destination_country",
      "line_item_count",
      "hs_code",
      "country_of_origin",
      "product_description",
      "gross_weight_kg",
      "net_weight_kg",
    ]);
  }

  return new Set();
}

function allowedTextFields(documentType: SourceDocumentType): Set<string> {
  if (documentType === "endUseStatement") {
    return new Set([
      "end_user",
      "end_user_address",
      "end_use",
      "end_use_statement_expiry",
      "end_use_statement_status",
      "risk_questionnaire_date",
      "risk_questionnaire_status",
    ]);
  }

  if (documentType === "technicalDatasheet") {
    return new Set([
      "product_description",
      "product_attributes",
      "technical_attributes",
      "technical_parameters_complete",
      "operating_temperature_range",
      "sensor_sampling_rate",
    ]);
  }

  return new Set();
}

function normalizeFieldValue(fieldKey: string, value: string): string {
  const trimmed = value.trim();

  if (["gross_weight_kg", "net_weight_kg", "invoice_value"].includes(fieldKey)) {
    return String(numericValue(trimmed) ?? trimmed);
  }

  if (fieldKey === "hs_code") {
    return trimmed;
  }

  if (fieldKey === "end_use_statement_expiry") {
    return normalizeDate(trimmed) ?? trimmed;
  }

  if (fieldKey === "technical_parameters_complete") {
    return /^(true|yes|complete|current)$/i.test(trimmed) ? "true" : "false";
  }

  return trimmed;
}

function draftValue(drafts: ExtractedFieldDraft[], fieldKey: string) {
  const draft = drafts.find((item) => item.fieldKey === fieldKey);
  return draft?.normalizedValue ?? draft?.value;
}

function hasDraftValue(drafts: ExtractedFieldDraft[], fieldKey: string): boolean {
  return isPresent(draftValue(drafts, fieldKey));
}

function numericValue(value: string): number | undefined {
  const match = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  const parsed = match ? Number(match[0]) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : undefined;
}

function futureOrToday(value: string | undefined | null): boolean {
  if (!value) {
    return false;
  }

  const normalized = normalizeDate(value);

  if (!normalized) {
    return false;
  }

  return new Date(`${normalized}T00:00:00.000Z`) >= CURRENT_DATE;
}

function normalizeDate(value: string): string | undefined {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString().slice(0, 10);
}

function isPdf(document: DocumentExtractionInput): boolean {
  return (
    document.mimeType === "application/pdf" ||
    document.filename.toLowerCase().endsWith(".pdf")
  );
}

function isText(document: DocumentExtractionInput): boolean {
  return (
    document.mimeType.startsWith("text/") ||
    document.filename.toLowerCase().endsWith(".txt")
  );
}

function isSpreadsheet(document: DocumentExtractionInput): boolean {
  return isCsv(document) || isXlsx(document);
}

function isCsv(document: DocumentExtractionInput): boolean {
  return (
    document.mimeType === "text/csv" ||
    document.filename.toLowerCase().endsWith(".csv")
  );
}

function isXlsx(document: DocumentExtractionInput): boolean {
  return (
    document.mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    document.filename.toLowerCase().endsWith(".xlsx")
  );
}

function isPresent(value: string | undefined | null): value is string {
  return Boolean(value && value.trim().length > 0);
}

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function labelForField(fieldKey: string): string {
  if (fieldKey === "gross_weight_kg") {
    return "Gross weight";
  }

  if (fieldKey === "net_weight_kg") {
    return "Net weight";
  }

  return fieldKey;
}

function columnLettersToIndex(value: string): number {
  return value.split("").reduce((sum, letter) => {
    return sum * 26 + letter.charCodeAt(0) - 64;
  }, 0) - 1;
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
