# Development

Native Windows PowerShell. **No Docker, WSL, PostgreSQL, or Redis.**

## Prerequisites

- Node.js 22+ (24 LTS recommended)
- npm 10+
- MySQL 8.4 or compatible server (local: MariaDB 10.11 at `C:\tools\mariadb-10.11`, port `3306`)
- Git

## Database setup (one-time)

```powershell
cd C:\Users\vin_c\Documents\Projects\tdlv\inspect
.\scripts\create-inspect-mysql.ps1
npm install
npm run db:generate
npm run db:migrate:deploy
npm run build:shared
```

Creates database `inspect` and user `inspect_app` with privileges limited to that database. Writes `DATABASE_URL` to gitignored `.env`.

### Auth migration (Milestone 2 Phase 1)

After pulling schema changes that add `users` / `sessions`:

```powershell
npm run db:generate
npm run db:migrate:deploy
```

This applies versioned migrations only (does not reset the database). Confirm against your local MariaDB before running deploy on shared environments.

Optional auth-related env vars are listed in `.env.example` (`SESSION_TTL_SECONDS`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`). Defaults are suitable for local HTTP development.

## Start

```powershell
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001
- The API process includes the NestJS Scheduler job worker (no separate worker process)

Auth API details: [AUTH.md](./AUTH.md).

## Quality

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

### Authentication tests

```powershell
npm run test -w @inspect/api -- --testPathPattern=auth
```

HTTP auth e2e cases need MySQL with migrations applied; they skip cleanly if the database is unreachable.

## MariaDB notes (this machine)

- Binary: `C:\tools\mariadb-10.11\bin\mariadbd.exe`
- Config: `Z:\Databases\mariadb-10.11\my.ini`
- Started via `Z:\Databases\mariadb-10.11\start-mariadb.ps1` (not a Windows service)
- Bind address: `127.0.0.1:3306`
- Character set: `utf8mb4` / `utf8mb4_unicode_ci`

Do not modify unrelated databases (for example other schemas on the same server).
