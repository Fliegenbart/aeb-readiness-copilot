# AEB Readiness Copilot Product Brief

AEB Readiness Copilot is a pitchable MVP for trade compliance and customs
operations teams. It helps users turn messy trade data into structured Evidence
Capsules, readiness scores, remediation tasks and an AEB-compatible payload
preview.

The first version uses deterministic demo data. That keeps the product reliable
for partner conversations and avoids paid external APIs while the workflow is
still being validated.

## Core Workflow

1. A logistics or compliance user selects a shipment.
2. The app assembles an Evidence Capsule from invoice, packing, ERP and supplier
   evidence.
3. Readiness rules identify missing data, contradictions and operational
   blockers.
4. The demo shows readiness scores for AEB-adjacent workflows.
5. A mock AEB adapter produces an AEB-compatible payload preview.

## Current MVP Scope

- Homepage with product positioning.
- `/demo` dashboard with Evidence Capsule summary cards.
- Deterministic demo Evidence Capsules.
- Readiness metrics in `/lib/readiness`.
- Optional provider-based extraction in `/lib/extraction`.
- Mock AEB adapter in `/lib/aeb`.
- Prisma schema and seed data for local SQLite demo setup.

## Extraction Positioning

The extraction layer can run without external AI. The deterministic provider is
the default. A mock AI provider is available for a more intelligent-feeling demo
while still using local fixtures. The OpenAI provider is a compiling skeleton
only and is not required for tests or local demo use.

AI-like extraction produces draft fields, not truth. Low-confidence values are
flagged for review, source references are preserved, and the MVP never makes
legal or customs conclusions.

## Non-Goals

- This is not a customs filing system.
- This is not a sanctions screening engine.
- This is not a tariff classification engine.
- This is not an export-control decision engine.
- The MVP uses mock AEB adapters only for AEB-adjacent workflow previews.

The correct wording for the MVP is AEB-ready, AEB-compatible payload preview,
mock AEB adapter and readiness check.
