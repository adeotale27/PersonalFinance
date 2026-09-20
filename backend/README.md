# Nivara backend

FastAPI + MongoDB service for Nivara Finance. It owns authentication, household ledgers, planning, document metadata and exports.

## Run locally

1. Create a Python 3.11+ virtual environment and install dependencies:
   `pip install -r requirements.txt`
2. Create `.env` with `MONGO_URL`, `DB_NAME`, and `JWT_SECRET`. Optional bootstrap settings: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, `CORS_ORIGINS`.
3. Start: `uvicorn server:app --reload --host 0.0.0.0 --port 8000`
4. Open `http://localhost:8000/docs` for the authenticated API schema. Login first through the frontend or send a bearer token.

## Data and integration contract

- Monetary, quantity and percentage fields are validated server-side; numbers must be finite and non-negative. Percentages cannot exceed 100.
- Dates are stored as `YYYY-MM-DD`; APIs accept that format plus `DD-MM-YYYY` and `DD/MM/YYYY`.
- Source financial records remain authoritative. Planner actions only store workflow state; **Record payment** writes to the relevant loan, policy, lending, rent or lease record.
- Documents use `related_entity_type` and `related_entity_id`, allowing future OCR, bank feed, cloud storage and advisor integrations without changing the document model.
- `GET /api/version-history` reads `version_history.json`. Update that file and `VERSION.md` together for each release.

## Verification

Run unit tests with `pytest`. These cover export generation, settings flushing, input validation and release-history loading. Integration tests require a disposable MongoDB plus authenticated test client; keep production credentials out of tests.

## Extending safely

Use the existing `/api` router boundary, `require_admin` dependency, soft deletion (`deleted_at`), audit logging for financial writes, and `serialize()` before returning Mongo records. Build external connectors as adapters that write reviewed records into the canonical collections rather than letting a provider dictate the household data model.
