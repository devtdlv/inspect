# Security

## Current posture (Milestone 1)

- Secrets live only in gitignored `.env`
- Application DB user `inspect_app` is limited to the `inspect` database (no global admin)
- Standardized API errors; validation via class-validator
- CORS restricted to configured origin
- Job payloads are not logged by the worker (handlers must stay careful in later milestones)
- CI uses ephemeral credentials; no personal secrets required for PRs

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
