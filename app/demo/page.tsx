import { AlertTriangle, CheckCircle2, Database, FileWarning } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { DashboardCard } from "@/components/dashboard-card";
import { createMockAebPayloadPreview } from "@/lib/aeb/mock-adapter";
import {
  demoEvidenceCapsules,
  sampleTradeDocumentText,
} from "@/lib/domain/demo-data";
import { getExtractionProvider } from "@/lib/extraction/config";
import { calculateDashboardMetrics } from "@/lib/readiness/dashboard-metrics";

const iconMap = {
  capsules: Database,
  ready: CheckCircle2,
  blocked: FileWarning,
  contradictions: AlertTriangle,
};

export default function DemoPage() {
  const metrics = calculateDashboardMetrics(demoEvidenceCapsules);
  const preview = createMockAebPayloadPreview(demoEvidenceCapsules[0]);
  const extraction = getExtractionProvider();
  const extractedFields = extraction.provider.extract(
    sampleTradeDocumentText,
    "commercial-invoice",
    { shipmentReference: demoEvidenceCapsules[0].reference },
  );

  const cards = [
    {
      title: "Total Evidence Capsules",
      value: metrics.totalEvidenceCapsules,
      detail: "Structured shipment evidence records",
      icon: iconMap.capsules,
    },
    {
      title: "Ready for Broker Handover",
      value: metrics.readyForBrokerHandover,
      detail: "No blocking evidence gaps detected",
      icon: iconMap.ready,
    },
    {
      title: "Blocked by Missing Evidence",
      value: metrics.blockedByMissingEvidence,
      detail: "Requires supplier or internal follow-up",
      icon: iconMap.blocked,
    },
    {
      title: "Data Contradictions",
      value: metrics.dataContradictions,
      detail: "Invoice, packing or ERP values disagree",
      icon: iconMap.contradictions,
    },
  ];

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
            Readiness check
          </p>
          <h1 className="text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
            Demo dashboard
          </h1>
          <p className="max-w-3xl text-base leading-7 text-slate-600">
            A deterministic demo view for AEB-adjacent workflows. This is not a
            customs filing system, sanctions engine, tariff classifier or
            export-control decision engine.
          </p>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <DashboardCard key={card.title} {...card} />
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">
                  Extraction provider preview
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Active provider: {extraction.activeProvider}
                  {extraction.disabledReason
                    ? ` (${extraction.disabledReason})`
                    : ""}
                </p>
              </div>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                {extraction.requestedProvider}
              </span>
            </div>

            <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
              <table className="w-full min-w-[840px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Field</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                    <th className="px-4 py-3 font-semibold">Confidence</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {extractedFields.map((field) => (
                    <tr key={`${field.fieldName}-${field.sourceReference.label}`}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {field.fieldName}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {String(field.value)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {Math.round(field.confidence * 100)}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            field.needsReview
                              ? "rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800"
                              : "rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800"
                          }
                        >
                          {field.needsReview ? "Review" : "Draft"}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        {field.sourceReference.excerpt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">
              Evidence Capsule queue
            </h2>
            <div className="mt-5 divide-y divide-slate-200">
              {demoEvidenceCapsules.map((capsule) => (
                <div
                  key={capsule.id}
                  className="grid gap-3 py-4 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {capsule.reference}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {capsule.shipper} to {capsule.consignee}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-slate-950">
                      {capsule.readinessScore}%
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                      {capsule.status.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  AEB-compatible payload preview
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Generated through the mock AEB adapter for demo purposes.
                </p>
              </div>
              <span className="rounded-md bg-teal-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-teal-200">
                mock AEB adapter
              </span>
            </div>
            <pre className="mt-5 max-h-[420px] overflow-auto rounded-md bg-black/35 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </article>
        </section>
      </main>
    </AppShell>
  );
}
