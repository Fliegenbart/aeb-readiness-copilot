"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const documentTypes = [
  { value: "commercialInvoice", label: "Commercial invoice" },
  { value: "packingList", label: "Packing list" },
  { value: "erpExport", label: "ERP export" },
  { value: "technicalDatasheet", label: "Technical datasheet" },
  { value: "endUseStatement", label: "End-use statement" },
  { value: "supplierEvidence", label: "Supplier evidence" },
  { value: "brokerEmail", label: "Broker email" },
  { value: "other", label: "Other" },
];

export function UploadDocumentForm({ capsuleId }: { capsuleId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("uploading");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/capsules/${capsuleId}/documents`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setStatus("error");
      setMessage(body?.error ?? "Upload failed.");
      return;
    }

    router.push(`/capsules/${capsuleId}`);
    router.refresh();
  }

  return (
    <form
      onSubmit={submitUpload}
      className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Source document type
          <select
            name="documentType"
            required
            defaultValue="commercialInvoice"
            className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-teal-700"
          >
            {documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-slate-700">
          File
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.csv,.xlsx,.txt,application/pdf,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-600">
          CSV/XLSX demo files are parsed for known columns. TXT files use simple
          key-value lines. PDFs are stored as uploaded evidence.
        </p>
        <button
          disabled={status === "uploading"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          <UploadCloud aria-hidden="true" size={16} />
          {status === "uploading" ? "Uploading..." : "Upload and Recompute"}
        </button>
      </div>

      {status === "error" ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
          {message}
        </p>
      ) : null}
    </form>
  );
}
