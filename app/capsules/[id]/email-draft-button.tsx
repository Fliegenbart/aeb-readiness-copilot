"use client";

import { useState } from "react";
import { Check, Copy, Mail, X } from "lucide-react";

import type { EmailDraft } from "@/lib/remediation/email-drafts";

export function EmailDraftButton({ draft }: { draft: EmailDraft }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyText = [
    `Subject: ${draft.subject}`,
    "",
    draft.body,
  ].join("\n");

  async function copyDraft() {
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <Mail aria-hidden="true" size={14} />
        Generate email draft
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Generated email draft"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6"
        >
          <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Email draft
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Recipient role: {formatRole(draft.recipientRole)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close email draft"
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>
            <div className="space-y-4 overflow-auto px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Evidence requested
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950">
                  {draft.evidenceRequested}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Subject
                </p>
                <p className="mt-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                  {draft.subject}
                </p>
              </div>
              <textarea
                readOnly
                value={draft.body}
                className="min-h-72 w-full resize-y rounded-md border border-slate-300 bg-white p-3 font-mono text-xs leading-6 text-slate-800"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={copyDraft}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                {copied ? (
                  <Check aria-hidden="true" size={14} />
                ) : (
                  <Copy aria-hidden="true" size={14} />
                )}
                {copied ? "Copied" : "Copy draft text"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatRole(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
