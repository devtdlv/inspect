# Roadmap

Inspect is delivered in eight milestones. Only completed work is marked done.

## Milestone 1 — Foundation & Development Environment

**Status:** Complete

- Monorepo with npm workspaces (`apps/web`, `apps/api`, `packages/shared`)
- NestJS API bootstrap with config validation, logging, CORS, and error handling
- React + Vite frontend shell (dark-first UI)
- MySQL-compatible database + Prisma migrations (dedicated `inspect` DB / `inspect_app` user)
- MySQL-backed jobs with NestJS Scheduler ([JOBS.md](./JOBS.md)); no Redis/BullMQ/pg-boss
- Docker-free local Windows development (Compose optional deploy reference only)
- CI (GitHub Actions + MySQL service), linting, formatting, and tests
- Architecture and security documentation

## Milestone 2 — Authentication, Workspaces & Monitors

**Status:** Phase 1 in progress (email/password auth). Workspaces and monitors not started.

### Phase 1 — Email and password authentication

- User registration and login (Argon2id, opaque cookie sessions)
- Session revocation, CSRF protections, rate limits
- `GET /api/v1/auth/me`
- See [AUTH.md](./AUTH.md)

### Later phases (not started)

- Personal workspaces
- Monitor CRUD for HTTP/HTTPS endpoints
- Authorization boundaries between workspaces

## Milestone 3 — Monitoring Engine

**Status:** Not started

- Scheduled health checks via MySQL-backed jobs / NestJS Scheduler workers
- Response-time measurement
- Safe outbound HTTP probing with SSRF protections
- Check result persistence

## Milestone 4 — Dashboard & Analytics

**Status:** Not started

- Uptime and latency analytics
- Responsive monitoring dashboard with real data
- Historical trends and summaries

## Milestone 5 — Incident Management

**Status:** Not started

- Automatic incident detection
- Incident history and recovery timelines
- Status transitions (open / acknowledged / resolved)

## Milestone 6 — Notifications & Reliability

**Status:** Not started

- Email notifications
- Notification preferences
- Delivery reliability and retry behavior

## Milestone 7 — UI Polish, Testing & Documentation

**Status:** Not started

- Visual polish and accessibility improvements
- Expanded automated test coverage
- End-user and operator documentation

## Milestone 8 — Deployment & v0.1.0 Release

**Status:** Not started

- Self-hosted deployment guides
- Production Compose / container images
- Tagged v0.1.0 release
