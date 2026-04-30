# AEB Readiness Copilot

AEB Readiness Copilot is a pitchable MVP for trade compliance and customs
operations teams. It turns messy shipment evidence into structured Evidence
Capsules, readiness checks and an AEB-compatible payload preview.

This is not an official AEB integration. The demo uses a mock AEB adapter.

## Local Setup

Install dependencies:

```bash
npm install
```

Create the local environment file:

```bash
cp .env.example .env
```

The default extraction provider is deterministic, so no API key is needed:

```bash
EXTRACTION_PROVIDER="deterministic"
```

For a smarter-looking local demo without external calls, use:

```bash
EXTRACTION_PROVIDER="mock-ai"
```

`EXTRACTION_PROVIDER="openai"` is only a compiling skeleton in this MVP. It is
disabled unless `OPENAI_API_KEY` is present, and it does not make live AI calls
yet.

Create the SQLite demo database:

```bash
npm run db:push
```

Seed demo data:

```bash
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Reset Demo Data

To wipe and recreate the local SQLite demo database:

```bash
npm run demo:reset
```

This runs Prisma `db push --force-reset` and then seeds the deterministic demo
Evidence Capsules again.

## Useful Scripts

- `npm run dev`: start the local Next.js app.
- `npm run build`: build the production app.
- `npm test`: run Vitest tests.
- `npm run db:push`: push the Prisma schema to SQLite.
- `npm run db:seed`: seed demo Evidence Capsules.
- `npm run demo:reset`: reset and reseed demo data.

## Product Notes

The MVP focuses on readiness before handover to AEB or an AEB-connected process.
It helps identify missing data, contradictions, evidence gaps and operational
blockers.

Non-goals:

- No customs filing system.
- No sanctions screening engine.
- No tariff classification engine.
- No export-control decision engine.
- No claim of official AEB integration.

## Extraction Providers

The extraction architecture lives in `/lib/extraction`.

- `DeterministicProvider`: default parser-style provider.
- `MockAIProvider`: fixture-based AI-like provider for demos.
- `OpenAIProvider`: skeleton only; not required to run or test the app.

All providers return structured field drafts. AI-like outputs are validated by a
schema, low-confidence fields are marked for review, source references are
preserved, and the system does not make legal or customs conclusions.
