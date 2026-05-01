"use client";

import { AlertTriangle, Home, RotateCw } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <AppShell>
      <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-6 py-16">
        <section className="w-full rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-amber-50 text-amber-700">
            <AlertTriangle aria-hidden="true" size={22} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold text-slate-950">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The demo could not load this view. No technical stack trace is shown
            here; API routes return typed errors for troubleshooting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <RotateCw aria-hidden="true" size={16} />
              Try again
            </button>
            <Link
              href="/demo"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Home aria-hidden="true" size={16} />
              Back to demo
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
