# Architecture

Inspect is a self-hosted API monitoring and observability web application (Milestone 1 foundation).

## Overview

```text
┌─────────────────┐     HTTP/REST      ┌─────────────────┐
│  apps/web       │ ─────────────────► │  apps/api       │
│  React + Vite   │                    │  NestJS         │
└─────────────────┘                    └────────┬────────┘
                                                │
                       ┌────────────────────────┼────────────────────────┐
                       ▼                                                 ▼
                ┌─────────────┐                                  ┌─────────────┐
                │ MySQL /     │                                  │ NestJS      │
                │ MariaDB     │◄─────────────────────────────────│ Scheduler   │
                │ (Prisma)    │     background_jobs table        │ workers     │
                └─────────────┘                                  └─────────────┘
```

## Monorepo

| Path              | Role                                                   |
| ----------------- | ------------------------------------------------------ |
| `apps/web`        | React SPA                                              |
| `apps/api`        | NestJS REST API, Prisma, MySQL jobs                    |
| `packages/shared` | Shared contracts                                       |
| `scripts/`        | Env loader + MySQL bootstrap helper                    |
| `compose.yaml`    | Optional deploy reference only (not for local Windows) |

## Backend

- NestJS modules with validated configuration
- Global prefix `/api/v1`; `/healthz` and `/readyz` excluded
- Prisma + MySQL (`utf8mb4`)
- MySQL-backed jobs via NestJS Schedule (see [JOBS.md](./JOBS.md))

## Local infrastructure (Windows)

- **Required:** Node.js, npm, MySQL-compatible server (this machine: MariaDB 10.11 on `127.0.0.1:3306`)
- **Not required:** Docker, WSL, PostgreSQL, Redis

## Non-goals for Milestone 1

Authentication, monitor CRUD, HTTP probing, incidents, notifications, and analytics are deferred.
