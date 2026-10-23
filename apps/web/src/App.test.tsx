import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import * as apiModule from './lib/api';

function renderApp() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('App shell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders navigation and overview placeholder', async () => {
    vi.spyOn(apiModule.api, 'getMetadata').mockResolvedValue({
      name: 'Inspect',
      version: '0.0.1',
      environment: 'test',
      docs: '/api/v1',
    });
    vi.spyOn(apiModule.api, 'getLiveness').mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
    vi.spyOn(apiModule.api, 'getReadiness').mockResolvedValue({
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: [
        { name: 'mysql', status: 'ok', latencyMs: 1 },
        { name: 'mysql-jobs', status: 'ok', latencyMs: 1 },
      ],
    });

    renderApp();

    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByText(/layout placeholder only/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('connected')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Inspect').length).toBeGreaterThan(0);
  });

  it('shows an error state when the API is unreachable', async () => {
    vi.spyOn(apiModule.api, 'getMetadata').mockRejectedValue(new Error('Network down'));
    vi.spyOn(apiModule.api, 'getLiveness').mockRejectedValue(new Error('Network down'));
    vi.spyOn(apiModule.api, 'getReadiness').mockRejectedValue(new Error('Network down'));

    renderApp();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not reach the api/i);
    });
    expect(screen.getByText('unreachable')).toBeInTheDocument();
  });
});
