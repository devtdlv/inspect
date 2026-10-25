# Security

## Current posture

- Secrets live only in gitignored `.env`
- Application DB user `inspect_app` is limited to the `inspect` database (no global admin)
- Standardized API errors; validation via class-validator
- Production (`NODE_ENV=production`) responses never expose internal exception messages for 5xx
- CORS restricted to a single configured origin with credentials (never `*`)
- Job payloads are not logged by the worker (handlers must stay careful in later milestones)
- CI uses ephemeral credentials; no personal secrets required for PRs

## Authentication (Milestone 2 Phase 1)

See [AUTH.md](./AUTH.md) for full detail. Summary:

- Argon2id password hashing; emails normalized
- Opaque session cookies; only SHA-256 token hashes in MySQL
- HttpOnly session cookie; `Secure` in production; configurable `SameSite`
- Double-submit CSRF (`inspect.csrf` + `X-CSRF-Token`) required for logout
- Origin check when `Origin` is present on login/register/logout
- Rate limits on login and registration
- Generic login failure messages; hashes and raw tokens never returned or logged

Operators must deploy the SPA and API under a CORS/cookie model consistent with [AUTH.md](./AUTH.md) (TLS in production, matching `API_CORS_ORIGIN`).

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
