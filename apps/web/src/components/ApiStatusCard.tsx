import { useApiLiveness, useApiMetadata, useApiReadiness } from '../hooks/useApiStatus';
import { getApiBaseUrl } from '../lib/api';

function StatusBadge({ label, tone }: { label: string; tone: 'ok' | 'error' | 'loading' }) {
  const toneClass =
    tone === 'ok'
      ? 'border-success/30 bg-success/10 text-success'
      : tone === 'error'
        ? 'border-danger/30 bg-danger/10 text-danger'
        : 'border-border bg-surface-overlay text-ink-subtle';

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs ${toneClass}`}
    >
      {label}
    </span>
  );
}

export function ApiStatusCard() {
  const metadata = useApiMetadata();
  const liveness = useApiLiveness();
  const readiness = useApiReadiness();

  return (
    <section className="rounded-lg border border-border bg-surface-raised p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink">API connectivity</h2>
          <p className="mt-1 font-mono text-xs text-ink-subtle">{getApiBaseUrl()}</p>
        </div>
        {metadata.isLoading ? (
          <StatusBadge label="loading" tone="loading" />
        ) : metadata.isError ? (
          <StatusBadge label="unreachable" tone="error" />
        ) : (
          <StatusBadge label="connected" tone="ok" />
        )}
      </div>

      {metadata.isLoading && (
        <p className="text-sm text-ink-muted" role="status">
          Checking API metadata…
        </p>
      )}

      {metadata.isError && (
        <div
          className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
          role="alert"
        >
          Could not reach the API. Start the backend and local infrastructure, then refresh.
          <p className="mt-2 font-mono text-xs text-danger/80">
            {metadata.error instanceof Error ? metadata.error.message : 'Unknown error'}
          </p>
        </div>
      )}

      {metadata.data && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-subtle">Name</dt>
            <dd className="mt-1 text-sm text-ink">{metadata.data.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-subtle">Version</dt>
            <dd className="mt-1 font-mono text-sm text-ink">{metadata.data.version}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-subtle">Environment</dt>
            <dd className="mt-1 font-mono text-sm text-ink">{metadata.data.environment}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-ink-subtle">Liveness</dt>
            <dd className="mt-1 text-sm text-ink">
              {liveness.isLoading
                ? '…'
                : liveness.isError
                  ? 'error'
                  : (liveness.data?.status ?? 'unknown')}
            </dd>
          </div>
        </dl>
      )}

      {readiness.data && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-subtle">Readiness</p>
          <ul className="space-y-2">
            {readiness.data.checks.map((check) => (
              <li
                key={check.name}
                className="flex items-center justify-between gap-3 text-sm text-ink-muted"
              >
                <span className="font-mono text-ink">{check.name}</span>
                <StatusBadge label={check.status} tone={check.status === 'ok' ? 'ok' : 'error'} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
