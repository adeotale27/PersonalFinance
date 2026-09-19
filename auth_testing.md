# Nivara Auth Testing

## Admin
- Email: `admin@nivara.app`
- Password: `Nivara@2026`

## API
```
curl -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@nivara.app","password":"Nivara@2026"}'
# -> { user, access_token }
curl http://localhost:8001/api/auth/me -H "Authorization: Bearer <access_token>"
```

Token is a JWT (7-day expiry). Frontend stores it in localStorage and sends it as
`Authorization: Bearer <token>`. Brute-force lockout: 5 failed attempts -> 15 min lock.
