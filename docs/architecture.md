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
- `/lib/aeb`: Mock AEB adapter code that creates AEB-compatible payload
  previews.
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
