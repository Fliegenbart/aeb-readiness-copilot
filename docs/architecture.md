# Architecture

This repository is structured to keep product workflow, business logic and UI
separate from each other.

## Main Modules

- `/app`: Next.js App Router routes. The homepage lives at `/`, and the demo
  dashboard lives at `/demo`.
- `/components`: Reusable UI components such as the app shell and dashboard
  cards.
- `/lib/domain`: Domain types and deterministic demo data for Evidence
  Capsules.
- `/lib/readiness`: Business rules and metrics for readiness checks.
- `/lib/aeb`: Adapter interfaces and mock AEB adapters that create
  AEB-compatible payload previews for AEB-adjacent workflows. These adapters do
  not connect to external AEB APIs.
- `/lib/extraction`: Provider-based extraction layer for deterministic parsing,
  fixture-based mock AI and a compiling OpenAI skeleton.
- `/prisma`: SQLite schema and seed script for local demo data.
- `/docs`: Product and architecture notes.

## Data Flow

The MVP currently uses deterministic demo data from `/lib/domain/demo-data.ts`.
The `/demo` route sends those Evidence Capsules through readiness metrics and
the mock AEB adapter.

SQLite and Prisma are included so the demo can grow into database-backed
workflows without mixing database code into UI components.

Payload previews are exposed through
`/api/capsules/[id]/payload/[target]` and the visual page
`/capsules/[id]/payloads/[target]`. The previews include validation warnings,
blocking issues and source field references so partner demos can show what data
would be prepared for an AEB-adjacent workflow after readiness checks.

Source-document uploads are exposed through `/capsules/[id]/upload` and
`POST /api/capsules/[id]/documents`. Files are stored in local demo storage
under `storage/uploads`, deterministic parsers create extracted fields for
known CSV, XLSX and TXT formats, and the upload flow records audit events before
recomputing readiness. PDFs are stored as evidence only; the MVP does not add
paid OCR or fragile AI extraction.

## Evidence Capsule Data Model

The Prisma schema models Evidence Capsules as operational readiness records,
not as customs filings. A capsule can have source documents, extracted fields,
contradictions, missing evidence, target-specific readiness checks,
remediation tasks and audit events.

The TypeScript mirror lives in `/lib/domain/types.ts`. It intentionally avoids
UI-specific assumptions so the same domain model can support dashboards,
payload previews, mock adapters and future API routes.

## Extraction Providers

Extraction is intentionally provider-based:

- `DeterministicProvider` is the default and requires no API key.
- `MockAIProvider` returns fixture-based, AI-like results for demos.
- `OpenAIProvider` is a skeleton only and is disabled unless `OPENAI_API_KEY`
  exists.

Configure the provider with `EXTRACTION_PROVIDER=deterministic | mock-ai |
openai`.

All extracted fields pass through schema validation. Low-confidence fields are
marked for review and are not treated as accepted evidence. Every field must
preserve a source reference, and providers must not make legal, customs,
sanctions, tariff classification or export-control conclusions.

## Testing

Vitest covers the readiness rules. As the MVP grows, readiness scoring,
contradiction detection and mock adapter payload generation should remain tested
outside of React components.

## Readiness Engine

The core rule engine lives in `/lib/readiness/engine.ts`. It is pure and
deterministic: callers pass an Evidence Capsule with documents, extracted
fields, contradictions and missing evidence, and the engine returns an overall
score, capsule status, target-specific readiness checks and reason codes.

Suggested remediation tasks are derived from the readiness result rather than
embedded in UI code. That keeps operational workflow logic testable and avoids
hard-coding dashboard assumptions into the domain model.
