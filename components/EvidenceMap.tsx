"use client";

import { useEffect, useMemo, useState } from "react";

export type EvidenceMapField = {
  id: string;
  fieldKey: string;
  label: string;
  value: string;
  confidence: number;
  sourceRef: string;
  sourceDocument?: {
    filename: string;
  } | null;
};

type EvidenceGroupId = "PARTIES" | "GOODS" | "LOGISTICS" | "COMPLIANCE" | "OTHER";

type EvidenceGroupConfig = {
  id: EvidenceGroupId;
  label: string;
  expectedTotal: number;
  fieldKeys: string[];
};

type EvidenceGroup = EvidenceGroupConfig & {
  fields: EvidenceMapField[];
  averageConfidence: number;
};

const GROUPS: EvidenceGroupConfig[] = [
  {
    id: "PARTIES",
    label: "Parties",
    expectedTotal: 6,
    fieldKeys: [
      "exporter",
      "exporter_address",
      "consignee",
      "consignee_address",
      "end_user",
      "end_user_address",
    ],
  },
  {
    id: "GOODS",
    label: "Goods",
    expectedTotal: 6,
    fieldKeys: [
      "product_description",
      "product_attributes",
      "hs_code",
      "country_of_origin",
      "classification_evidence_status",
      "origin_evidence",
      "preference_claimed",
      "preferential_origin_statement",
    ],
  },
  {
    id: "LOGISTICS",
    label: "Logistics",
    expectedTotal: 9,
    fieldKeys: [
      "gross_weight",
      "gross_weight_kg",
      "net_weight",
      "net_weight_kg",
      "dimensions",
      "package_count",
      "line_items",
      "line_item_count",
      "currency",
      "invoice_value",
      "destination_country",
    ],
  },
  {
    id: "COMPLIANCE",
    label: "Compliance",
    expectedTotal: 5,
    fieldKeys: [
      "end_use",
      "risk_questionnaire_status",
      "risk_questionnaire_date",
      "technical_parameters_complete",
      "license_evidence",
      "no_license_required",
      "end_use_statement_expiry",
      "current_end_use_statement",
      "operating_temperature_range",
      "sensor_sampling_rate",
    ],
  },
];

const OTHER_GROUP: EvidenceGroupConfig = {
  id: "OTHER",
  label: "Other",
  expectedTotal: 0,
  fieldKeys: [],
};

export function EvidenceMap({ fields }: { fields: EvidenceMapField[] }) {
  const groups = useMemo(() => groupEvidenceFields(fields), [fields]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<EvidenceGroupId>>(
    () => new Set(),
  );

  useEffect(() => {
    const other = groups.find((group) => group.id === "OTHER");

    if (other && other.fields.length > 0) {
      console.info(
        "Evidence Map fields in OTHER:",
        other.fields.map((field) => `${field.fieldKey} (${field.label})`),
      );
    }
  }, [groups]);

  function toggleGroup(groupId: EvidenceGroupId) {
    setCollapsedGroups((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="p-5 text-sm leading-6 text-slate-600">
        No extracted fields are stored for this capsule yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.id);

        return (
          <section key={group.id}>
            <button
              aria-expanded={!isCollapsed}
              className="flex w-full items-center justify-between gap-4 bg-slate-50 px-5 py-3 text-left transition hover:bg-slate-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
              onClick={() => toggleGroup(group.id)}
              type="button"
            >
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                  {group.id}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {fieldCounter(group)}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  avg {group.averageConfidence}%
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`text-sm text-slate-400 transition-transform ${
                  isCollapsed ? "-rotate-90" : "rotate-0"
                }`}
              >
               ⌄
              </span>
            </button>

            {!isCollapsed ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Field</th>
                      <th className="px-4 py-3 font-semibold">Value</th>
                      <th className="px-4 py-3 font-semibold">Source document</th>
                      <th className="px-4 py-3 font-semibold">Confidence</th>
                      <th className="px-4 py-3 font-semibold">Source reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {group.fields.map((field) => (
                      <tr key={field.id}>
                        <td className="px-4 py-3 font-semibold text-slate-950">
                          {field.label}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {field.value}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {field.sourceDocument?.filename ?? "Capsule context"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {Math.round(field.confidence * 100)}%
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {field.sourceRef}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function groupEvidenceFields(fields: EvidenceMapField[]): EvidenceGroup[] {
  const knownKeys = new Set(GROUPS.flatMap((group) => group.fieldKeys));
  const sortedGroups = [...GROUPS, OTHER_GROUP].map((group) => ({
    ...group,
    fields: fields.filter((field) =>
      group.id === "OTHER"
        ? !knownKeys.has(normalizeKey(field.fieldKey))
        : group.fieldKeys.includes(normalizeKey(field.fieldKey)),
    ),
    averageConfidence: 0,
  }));

  return sortedGroups
    .map((group) => ({
      ...group,
      averageConfidence: averageConfidence(group.fields),
    }))
    .filter((group) => group.fields.length > 0);
}

function fieldCounter(group: EvidenceGroup): string {
  if (group.id === "OTHER") {
    return `${group.fields.length} fields`;
  }

  return `${group.fields.length} / ${group.expectedTotal} fields`;
}

function averageConfidence(fields: EvidenceMapField[]): number {
  if (fields.length === 0) {
    return 0;
  }

  const average =
    fields.reduce((sum, field) => sum + field.confidence, 0) / fields.length;

  return Math.round(average * 100);
}

function normalizeKey(fieldKey: string): string {
  return fieldKey.trim().toLowerCase();
}
