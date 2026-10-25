# Security

## Current posture

- Secrets live only in gitignored `.env`
- Application DB user `inspect_app` is limited to the `inspect` database (no global admin)
- Standardized API errors; validation via class-validator
- Production (`NODE_ENV=production`) responses never expose internal exception messages for 5xx
- CORS restricted to a single configured origin with credentials (never `*`)
- Job payloads are not logged by the worker (handlers must stay careful in later milestones)
- CI uses ephemeral credentials; no personal secrets required for PRs
- Queue diagnostics require an authenticated session (not public)

## Authentication (Milestone 2 Phase 1)

See [AUTH.md](./AUTH.md) for full detail. Summary:

- Argon2id password hashing; emails normalized
- Login verify path uses a cached dummy Argon2id digest when the user is missing (timing hardening)
- Opaque session cookies; only SHA-256 token hashes in MySQL
- HttpOnly session cookie; `Secure` mandatory in production; configurable `SameSite`
- Double-submit CSRF (`inspect.csrf` + `X-CSRF-Token`) required for logout
- Origin required in production (and whenever `SameSite=none`); must match `API_CORS_ORIGIN`
- Rate limits on login and registration (validated env; in-memory store is per-process only)
- Generic login failure messages; hashes and raw tokens never returned or logged
- Registration may reveal email existence via HTTP 409 (documented UX tradeoff)

Operators must deploy the SPA and API under a CORS/cookie model consistent with [AUTH.md](./AUTH.md) (TLS in production, matching `API_CORS_ORIGIN`).

### Production checklist (auth)

- [ ] `NODE_ENV=production`
- [ ] TLS terminated in front of the API
- [ ] Do not set `COOKIE_SECURE=false`
- [ ] `API_CORS_ORIGIN` exact SPA origin
- [ ] Prefer `SameSite=lax` or `strict` when SPA and API are same-site; use `none` only with Secure HTTPS
- [ ] Do not disable `AUTH_REQUIRE_ORIGIN` in production
- [ ] Keep `AUTH_SENSITIVE_RATE_LIMIT` ≤ 30; add edge/WAF limits for multi-instance
- [ ] Do not enable blanket Express `trust proxy` / forwarded-header trust without a careful proxy design

## Dependency advisories

`npm audit` may report:

| Area                               | Severity          | Exposure   | Notes                                    |
| ---------------------------------- | ----------------- | ---------- | ---------------------------------------- |
| vitest / tinypool / @vitest/mocker | moderate–critical | Dev-only   | Fix needs Vitest 5 (breaking). Deferred. |
| prisma / deepmerge-ts              | high              | CLI/config | Fix needs Prisma 7 (breaking). Deferred. |

`npm audit fix --force` is not used.

## Future monitoring risks

When HTTP probing ships, SSRF, private network access, metadata endpoints, unsafe redirects, DNS rebinding, unbounded responses, and credential leakage must be blocked. See acceptance criteria in earlier security planning; implementation is Milestone 3+.

## Reporting

Report security issues privately to `devtdlv`.
