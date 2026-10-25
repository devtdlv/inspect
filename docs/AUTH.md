# Authentication (Milestone 2, Phase 1)

Email-and-password authentication with opaque, revocable server-side sessions.

Workspaces, monitors, incidents, and notifications are **not** included in this phase.

## Architecture

- Passwords are hashed with **Argon2id** before storage (`users.password_hash`).
- Emails are trimmed and lowercased before insert/lookup.
- Login issues an opaque session token (32 random bytes, base64url) in an **HttpOnly** cookie.
- MySQL stores only the **SHA-256** hex digest of that token (`sessions.token_hash`).
- A parallel non-HttpOnly **CSRF** cookie is set for double-submit protection on logout.
- JWTs are not used.

## Endpoints

| Method | Path                    | Auth           | Notes                           |
| ------ | ----------------------- | -------------- | ------------------------------- |
| `POST` | `/api/v1/auth/register` | No             | Creates user + session cookies  |
| `POST` | `/api/v1/auth/login`    | No             | Creates session cookies         |
| `POST` | `/api/v1/auth/logout`   | Cookie + CSRF  | Revokes session, clears cookies |
| `GET`  | `/api/v1/auth/me`       | Session cookie | Current user                    |

### Request bodies

Register / login:

```json
{ "email": "user@example.com", "password": "at-least-8-chars" }
```

Constraints: email max 320 chars; password 8–128 chars. Extra properties are rejected.
Emails are trimmed and lowercased in the request DTO **before** `@IsEmail()` validation, then stored/looked up in that normalized form.

### Success responses

Register (`201`) / login (`200`) / me (`200`):

```json
{
  "user": {
    "id": "cl…",
    "email": "user@example.com",
    "createdAt": "2026-10-24T00:00:00.000Z"
  }
}
```

Logout (`200`): `{ "ok": true }`

Password hashes, session tokens, and token hashes are never returned.

## Session lifecycle

1. Register or login validates credentials and inserts a `sessions` row with `expires_at`.
2. Browser stores `inspect.sid` (HttpOnly) and `inspect.csrf` (readable).
3. Authenticated routes load the session by hashing the cookie and rejecting revoked or expired rows.
4. Logout sets `revoked_at`, then clears both cookies.

Default TTL: `SESSION_TTL_SECONDS` (14 days unless overridden).

## Cookies

| Cookie         | HttpOnly | Purpose                  |
| -------------- | -------- | ------------------------ |
| `inspect.sid`  | Yes      | Opaque session token     |
| `inspect.csrf` | No       | Double-submit CSRF token |

Attributes:

- `Path=/`
- `SameSite` from `COOKIE_SAME_SITE` (default `lax`)
- `Secure` when `NODE_ENV=production`, or when `COOKIE_SECURE=true`

### Deployment assumptions

- The SPA origin must match `API_CORS_ORIGIN` exactly. Credentialed CORS never uses `*`.
- For local Vite (`http://localhost:5173`) → API (`http://localhost:3001`), `SameSite=Lax` and `Secure=false` are appropriate.
- Production should terminate TLS and leave `COOKIE_SECURE` at its production default (`true`).
- If the web app and API are truly cross-site (different sites, not just subdomains), use `COOKIE_SAME_SITE=none` **and** `COOKIE_SECURE=true` over HTTPS.
- Browser clients must call the API with `credentials: 'include'`.
- Logout must send header `X-CSRF-Token` equal to the `inspect.csrf` cookie value.
- Login/register reject a present `Origin` that does not match `API_CORS_ORIGIN`.

## Rate limiting

Login and register are limited to **10 requests per IP per minute** (`@nestjs/throttler`). Other auth routes inherit the module default (120/min).

## Local development

1. Apply the auth migration (see Development docs) so `users` and `sessions` exist.
2. Optional `.env` keys are documented in `.env.example` (`SESSION_TTL_SECONDS`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`).
3. No additional secrets are required for sessions (tokens are random; only hashes are stored).

## Tests

```powershell
npm run test -w @inspect/api -- --testPathPattern=auth
```

- Unit specs cover Argon2 hashing, email normalization, session hashing/expiry/revocation, CSRF guard, and auth service flows.
- `test/auth.e2e-spec.ts` exercises HTTP register/login/me/logout, CSRF, Origin checks, and rate limits against MySQL when `DATABASE_URL` is reachable and migrations are applied. Otherwise those cases are skipped.
