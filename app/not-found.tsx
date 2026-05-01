import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";

export default function NotFoundPage() {
  return (
    <AppShell>
      <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-6 py-16">
        <section className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <SearchX aria-hidden="true" size={22} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">
            Page not found
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This capsule, payload preview, or demo page is not available in the
            local dataset. Reset demo data if the sample records were removed.
          </p>
          <Link
            href="/demo"
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Back to demo
          </Link>
        </section>
      </main>
    </AppShell>
  );
}
