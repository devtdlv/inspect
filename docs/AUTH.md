# Authentication (Milestone 2, Phase 1)

Email-and-password authentication with opaque, revocable server-side sessions.

Workspaces, monitors, incidents, and notifications are **not** included in this phase.

## Architecture

- Passwords are hashed with **Argon2id** before storage (`users.password_hash`).
- Failed logins for unknown emails still run Argon2id verification against a process-local dummy digest (not regenerated per request) so response timing does not trivially reveal whether an email is registered.
- Emails are trimmed and lowercased before insert/lookup.
- Login issues an opaque session token (32 random bytes, base64url) in an **HttpOnly** cookie.
- MySQL stores only the **SHA-256** hex digest of that token (`sessions.token_hash`).
- A parallel non-HttpOnly **CSRF** cookie is set for double-submit protection on logout.
- JWTs are not used.

## Endpoints

| Method | Path                        | Auth           | Notes                                       |
| ------ | --------------------------- | -------------- | ------------------------------------------- |
| `POST` | `/api/v1/auth/register`     | No             | Creates user + session cookies              |
| `POST` | `/api/v1/auth/login`        | No             | Creates session cookies                     |
| `POST` | `/api/v1/auth/logout`       | Cookie + CSRF  | Revokes session, clears cookies             |
| `GET`  | `/api/v1/auth/me`           | Session cookie | Current user                                |
| `GET`  | `/api/v1/diagnostics/queue` | Session cookie | Job diagnostics (future: may require admin) |

Public liveness/readiness remain unauthenticated: `GET /healthz`, `GET /readyz`.

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

Password hashes, session tokens, and token hashes are never returned. Auth code paths do not log passwords, raw session tokens, or cookie values.

### Registration email enumeration (documented tradeoff)

Duplicate registration returns **HTTP 409** with a clear message that the email is already registered. This is an intentional UX choice for a self-hosted product: operators and users get actionable feedback.

**Tradeoff:** Attackers can discover whether an email has an account via register. Login failures intentionally do **not** reveal existence (generic message + timing-hardened verify). Mitigations: rate limits on register, optional future CAPTCHA / invite-only modes.

## Session lifecycle

1. Register or login validates credentials and inserts a `sessions` row with `expires_at`.
2. Browser stores `inspect.sid` (HttpOnly) and `inspect.csrf` (readable).
3. Authenticated routes load the session by hashing the cookie and rejecting revoked or expired rows.
4. Logout sets `revoked_at`, then clears both cookies.

Default TTL: `SESSION_TTL_SECONDS` (14 days unless overridden).

### Limitations (not yet implemented)

- Expired and revoked session rows are not automatically purged (enforcement is at read time only).
- There is no per-user concurrent session cap and no “revoke other sessions on login”.
- No idle timeout separate from absolute `expires_at`.

## Cookies

| Cookie         | HttpOnly | Purpose                  |
| -------------- | -------- | ------------------------ |
| `inspect.sid`  | Yes      | Opaque session token     |
| `inspect.csrf` | No       | Double-submit CSRF token |

Attributes:

- `Path=/`
- `SameSite` from `COOKIE_SAME_SITE` (default `lax`)
- `Secure` when `NODE_ENV=production` (forced; cannot disable), or when `COOKIE_SECURE=true`

### Origin and CSRF policy

| Environment             | Missing `Origin`    | Present `Origin`                     |
| ----------------------- | ------------------- | ------------------------------------ |
| `production`            | **Rejected**        | Must equal `API_CORS_ORIGIN`         |
| `COOKIE_SAME_SITE=none` | **Rejected**        | Must equal `API_CORS_ORIGIN`         |
| `development` / `test`  | Allowed (CLI/tests) | Must equal `API_CORS_ORIGIN` if sent |

- Override: `AUTH_REQUIRE_ORIGIN=true|false` (cannot set `false` in production).
- Login/register do **not** use double-submit CSRF (no prior session cookie). Browser CSRF resistance for those routes depends on Origin enforcement + `SameSite`. A CSRF bootstrap cookie is intentionally not required so first-time register/login remains possible.
- Logout requires CSRF: header `X-CSRF-Token` must match `inspect.csrf`.
- `SameSite=None` deployments must use HTTPS (`COOKIE_SECURE=true`) and will require Origin on auth mutations.

### Deployment assumptions

- The SPA origin must match `API_CORS_ORIGIN` exactly. Credentialed CORS never uses `*`.
- For local Vite (`http://localhost:5173`) → API (`http://localhost:3001`), `SameSite=Lax` and `Secure=false` are appropriate.
- Production must terminate TLS; `COOKIE_SECURE=false` is rejected when `NODE_ENV=production`.
- Browser clients must call the API with `credentials: 'include'`.

## Rate limiting

Login and register default to **10 requests per IP per rolling minute** (`@nestjs/throttler`).

| Variable                     | Default | Bounds                    |
| ---------------------------- | ------- | ------------------------- |
| `AUTH_SENSITIVE_RATE_LIMIT`  | 10      | 1–100 (≤30 in production) |
| `AUTH_SENSITIVE_RATE_TTL_MS` | 60000   | 1000–600000               |

**Important:** Nest’s default throttler storage is **in-memory and per process**. It is **not** sufficient alone for multi-instance production. Prefer a single API instance, edge/WAF limits, or a future shared store (not introduced in this phase).

**Trusted proxy / IP:** Inspect does **not** enable Express `trust proxy` by default. Throttling keys use the direct TCP peer (`req.ip`). Do not blanket-trust `X-Forwarded-For`. If you terminate TLS on a reverse proxy, place network-level limits at that proxy or run a single Node process until shared throttling exists.

## Local development

1. Apply the auth migration (see Development docs) so `users` and `sessions` exist.
2. Optional auth env vars are listed in `.env.example`.
3. No additional secrets are required for sessions (tokens are random; only hashes are stored).

## Tests

```powershell
node scripts/run-with-env.mjs npm run test -w @inspect/api -- --testPathPatterns=auth
```

- Unit specs cover Argon2 hashing (including dummy login verify), email normalization, sessions, CSRF, Origin policies, and config validation.
- `test/auth.e2e-spec.ts` requires reachable MySQL with migrations applied (fails hard if unavailable; does not silently skip).
