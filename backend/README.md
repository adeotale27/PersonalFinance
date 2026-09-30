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

### Isolated local E2E workspace

The full seeded QA workspace is opt-in and uses the normal login flow; it does not bypass authentication. Never point it at Atlas or another shared database.

1. Ensure local MongoDB is running.
2. Copy `.env.e2e.example` to `.env.e2e` and replace `JWT_SECRET` with a random local value. The example account and password are for this disposable local database only.
3. Start the backend from this folder with `.\.venv\Scripts\Activate.ps1; uvicorn server:app --env-file .env.e2e --host 127.0.0.1 --port 8001`.
4. In another terminal run `cd frontend; $env:REACT_APP_BACKEND_URL='http://localhost:8001'; npm start -- --port 3001`.
5. Extra dummy goals, necessities, diary, loss, reminder and leased-farm records are seeded on startup when `NIVARA_E2E_DEMO=true`. The sample architect and contractor portals include payments linked to the correct party.
6. Run `python -m pytest -q` from `backend` for unit tests and `python run_e2e_local.py` for database-backed API and calculation checks. The E2E runner creates and removes its own uniquely named local database. Use `--keep-db` only when you need to keep the dummy records for browser inspection.

The E2E startup guard requires a loopback MongoDB host and a database name starting with `nivara_e2e_`. Project deletion in the app offboards party logins while retaining the deleted project and its financial history. Keep `.env.e2e` private, never reuse its password elsewhere, and drop only the disposable `nivara_e2e_*` database after testing.

## Extending safely

Use the existing `/api` router boundary, `require_admin` dependency, soft deletion (`deleted_at`), audit logging for financial writes, and `serialize()` before returning Mongo records. Build external connectors as adapters that write reviewed records into the canonical collections rather than letting a provider dictate the household data model.
