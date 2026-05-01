# Pre-Pitch Open Issues

Last reviewed: 2026-04-30

## P1 - Add Browser Smoke Tests for the Demo Story

The repo has meaningful unit and service tests, but no automated browser smoke
test that walks `/pitch`, `/demo`, a capsule detail page and one payload preview
after `npm run demo:reset`.

Recommendation: add a small Playwright suite that runs against seeded data and
asserts the guided pitch steps, the readiness matrix and one mock AEB adapter
payload preview render without errors.

## P1 - Define the Path From Mock Adapter to Production Connectivity

The current `/lib/aeb` adapters are correctly labeled as mock AEB adapters and
do not connect to external AEB APIs. A partner technical review will likely ask
what would be required to turn a payload preview into a production handoff.

Recommendation: prepare a short technical appendix covering required API
contracts, authentication, customer-specific mapping, retry/error handling,
audit controls and acceptance testing.

## P2 - Harden Document Uploads for Pilot Use

Uploads are validated for demo file type and size, stored locally, and ignored
by git. That is appropriate for the MVP demo, but not enough for a pilot with
customer files.

Recommendation: before any real customer data, add authenticated upload access,
malware scanning, file retention rules, storage encryption, tenant isolation and
object storage instead of local filesystem storage.

## P2 - Calibrate Readiness Scoring With Domain Owners

Readiness scores are explainable through reason codes, per-target summaries and
blocking/warning details. The scoring is deterministic and demo-friendly, but
the weights have not been validated by trade compliance process owners.

Recommendation: run a rules calibration workshop with logistics, trade
compliance and broker stakeholders, then version the rule set and document score
semantics.

## P2 - Add Authentication and Role-Aware Audit Controls

Audit events are created for recompute, upload, task status changes and payload
preview generation. Actors are currently demo actors such as `demo.user` or
`api`.

Recommendation: add authentication, role-aware actor attribution and audit log
access controls before showing real operational data.

## P3 - Improve PDF Extraction Beyond Demo Storage

PDF uploads are stored as evidence, but complex OCR/text extraction is outside
the MVP scope. This is acceptable for the pitch because deterministic CSV, XLSX
and TXT extraction demonstrate the workflow.

Recommendation: evaluate OCR/text extraction libraries and human-in-the-loop
review UX before relying on PDF extraction in a pilot.
