# Architecture

Inspect is a self-hosted API monitoring and observability web application.

## Overview

```text
┌─────────────────┐     HTTP/REST      ┌─────────────────┐
│  apps/web       │ ─────────────────► │  apps/api       │
│  React + Vite   │   cookie session   │  NestJS         │
└─────────────────┘                    └────────┬────────┘
                                                │
                       ┌────────────────────────┼────────────────────────┐
                       ▼                                                 ▼
                ┌─────────────┐                                  ┌─────────────┐
                │ MySQL /     │                                  │ NestJS      │
                │ MariaDB     │◄─────────────────────────────────│ Scheduler   │
                │ (Prisma)    │     background_jobs + auth       │ workers     │
                └─────────────┘                                  └─────────────┘
```

## Monorepo

| Path              | Role                                                   |
| ----------------- | ------------------------------------------------------ |
| `apps/web`        | React SPA                                              |
| `apps/api`        | NestJS REST API, Prisma, MySQL jobs, auth              |
| `packages/shared` | Shared contracts                                       |
| `scripts/`        | Env loader + MySQL bootstrap helper                    |
| `compose.yaml`    | Optional deploy reference only (not for local Windows) |

## Backend

- NestJS modules with validated configuration
- Global prefix `/api/v1`; `/healthz` and `/readyz` excluded
- Prisma + MySQL (`utf8mb4`)
- MySQL-backed jobs via NestJS Schedule (see [JOBS.md](./JOBS.md))
- Email/password auth with opaque sessions (see [AUTH.md](./AUTH.md)) — Milestone 2 Phase 1

## Local infrastructure (Windows)

- **Required:** Node.js, npm, MySQL-compatible server (this machine: MariaDB 10.11 on `127.0.0.1:3306`)
- **Not required:** Docker, WSL, PostgreSQL, Redis

## Milestone status (high level)

- Milestone 1 foundation: delivered
- Milestone 2 Phase 1 (auth): in progress in this codebase
- Workspaces, monitors, incidents: later phases/milestones
