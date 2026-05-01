import { ArrowLeft, FileUp } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCapsuleDetail } from "@/lib/demo/dashboard-data";
import { UploadDocumentForm } from "./upload-form";

export const dynamic = "force-dynamic";

type UploadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UploadPage({ params }: UploadPageProps) {
  const { id } = await params;
  const capsule = await getCapsuleDetail(id);

  if (!capsule) {
    notFound();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-5 py-8">
        <Link
          href={`/capsules/${capsule.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-950"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          Back to capsule
        </Link>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex size-11 items-center justify-center rounded-md bg-teal-50 text-teal-700">
              <FileUp aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">
                {capsule.capsuleNumber}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">
                Upload Source Document
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Add invoice, packing, ERP, TXT evidence or PDF documents to this
                Evidence Capsule. The demo stores the file locally, extracts
                known deterministic fields, records audit events and recomputes
                AEB-ready readiness checks.
              </p>
            </div>
          </div>
        </section>

        <UploadDocumentForm capsuleId={capsule.id} />
      </main>
    </AppShell>
  );
}
