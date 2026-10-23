# Background jobs

Inspect uses a **MySQL-backed job table** polled by **NestJS Scheduler**.

There is no Redis, BullMQ, or pg-boss.

## Design

| Piece                              | Role                                                |
| ---------------------------------- | --------------------------------------------------- |
| `background_jobs` table            | Durable job store (Prisma model `BackgroundJob`)    |
| `JobsService`                      | Enqueue, atomic claim, complete/fail/retry, cleanup |
| `JobsWorkerService`                | `@Interval` poller that claims and executes jobs    |
| Diagnostic type `diagnostics.ping` | Harmless Milestone 1 proof job                      |

## Semantics

- **At-least-once** delivery: a job may run more than once if a worker crashes after executing but before completion is persisted.
- Handlers must be **idempotent**.
- Claiming uses `SELECT … FOR UPDATE SKIP LOCKED` inside a transaction so concurrent workers cannot take the same row.
- Worker leases (`locked_until`) expire so abandoned `processing` jobs can be recovered.
- Retries are bounded (`max_attempts`) with delayed `run_at`.
- Diagnostic rows are deleted after a retention window to prevent unbounded growth.
- Graceful shutdown stops new claims and waits briefly for an in-flight tick.

Milestone 1 does **not** promise exactly-once execution.

## Configuration

| Variable                         | Purpose                                             |
| -------------------------------- | --------------------------------------------------- |
| `JOB_POLL_INTERVAL_MS`           | Documented poll cadence (worker interval is 1000ms) |
| `JOB_LEASE_SECONDS`              | Claim lease duration                                |
| `JOB_DIAGNOSTIC_RETENTION_HOURS` | Cleanup window for finished diagnostics             |

## Diagnostics

`GET /api/v1/diagnostics/queue` enqueues one diagnostic job, drives the worker until completion, then reports health. It does not run on every `/readyz` call.
