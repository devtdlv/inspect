import type {
  AppMetadata,
  LivenessResponse,
  QueueDiagnosticsResponse,
  ReadinessResponse,
} from '@inspect/shared';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://localhost:3001';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') {
        detail = body.message;
      } else if (Array.isArray(body.message)) {
        detail = body.message.join(', ');
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  getMetadata: () => request<AppMetadata>('/api/v1'),
  getLiveness: () => request<LivenessResponse>('/healthz'),
  getReadiness: () => request<ReadinessResponse>('/readyz'),
  getQueueDiagnostics: () => request<QueueDiagnosticsResponse>('/api/v1/diagnostics/queue'),
};

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
