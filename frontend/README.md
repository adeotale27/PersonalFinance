# Nivara frontend

React single-page application for Nivara Finance’s household financial operating system.

## Run locally

1. Install dependencies: `npm install`
2. Create `.env.local` with `REACT_APP_BACKEND_URL=http://localhost:8000`.
3. Start development mode: `npm start`
4. Make a production build: `npm run build`

## Product areas

- **Action Center**: pay, review, postpone or resolve commitments from their source record.
- **Review Inbox**: searchable cross-module queue for transactions and dated financial records.
- **Financial Planner**: 30-day forecast, tight-date warning, transparent health signals, ownership rollups and spreadsheet snapshot export.
- **Document Vault**: categories and source-link fields for financial evidence.
- **What’s new**: header button showing current and past releases from the backend release-history API.

## Frontend standards

Every numeric form input uses `type="number"`, a non-negative minimum and server-side validation as the final authority. Text fields are intentionally open for Indian names, account references, notes and local terminology. API writes clear the short-lived response cache; errors are reported to the backend operational log without exposing secrets to the UI.

For future integrations, add API clients in `src/lib`, preserve the current REST API as the UI boundary, and use reviewed inbox records rather than silently creating financial transactions.
