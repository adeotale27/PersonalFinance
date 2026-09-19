# Nivara — Test Credentials

## Admin (Super Admin — full access)
- URL: use REACT_APP_BACKEND_URL frontend, login page `/login`
- Email: `admin@nivara.app`
- Password: `Nivara@2026`
- Role: SUPER_ADMIN

## Demo Party Users (created by seed, granular project access)
- Architect — Email: `architect@nivara.app` / Password: `Architect@2026` (role PARTY_USER)
- Contractor A — Email: `contractor.a@nivara.app` / Password: `Contractor@2026` (role PARTY_USER)

Note: The current build enforces admin-only access on all API endpoints (party portals are a later slice).
Party users are stored with granular permission grants that the admin manages in Access Control.

## Auth endpoints (prefix /api)
- POST /api/auth/login  { email, password } -> { user, access_token }
- POST /api/auth/logout
- GET  /api/auth/me   (Bearer token)

Auth uses JWT. Frontend sends `Authorization: Bearer <token>` (token stored in localStorage).
