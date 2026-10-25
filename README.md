# Inspect

Self-hosted API monitoring and observability for HTTP/HTTPS endpoints.

**Status:** Milestone 2 Phase 1 — Email/password authentication (MySQL sessions)

**Repository:** https://github.com/devtdlv/inspect

## Stack

| Layer    | Choices                                                                |
| -------- | ---------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query |
| Backend  | Node.js 24 LTS, NestJS 11, TypeScript                                  |
| Database | MySQL-compatible (Prisma migrations)                                   |
| Jobs     | NestJS Scheduler + MySQL `background_jobs`                             |
| Monorepo | npm workspaces                                                         |

No Docker, WSL, PostgreSQL, or Redis for local development.

## Roadmap

1. Foundation & Development Environment (complete)
2. Authentication, Workspaces & Monitors (Phase 1: auth in progress)
3. Monitoring Engine
4. Dashboard & Analytics
5. Incident Management
6. Notifications & Reliability
7. UI Polish, Testing & Documentation
8. Deployment & v0.1.0 Release

## Quick start (Windows PowerShell)

```powershell
cd C:\Users\vin_c\Documents\Projects\tdlv\inspect
.\scripts\create-inspect-mysql.ps1
npm install
npm run db:generate
npm run db:migrate:deploy
npm run build:shared
npm run dev
```

## Endpoints

- `GET /healthz` — liveness
- `GET /readyz` — MySQL + job worker readiness
- `GET /api/v1` — metadata
- `GET /api/v1/diagnostics/queue` — MySQL job diagnostic (authenticated session required)
- `POST /api/v1/auth/register` — register (sets session cookies)
- `POST /api/v1/auth/login` — login (sets session cookies)
- `POST /api/v1/auth/logout` — logout (CSRF required)
- `GET /api/v1/auth/me` — current user

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Authentication](docs/AUTH.md)
- [Development](docs/DEVELOPMENT.md)
- [Jobs](docs/JOBS.md)
- [Security](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
