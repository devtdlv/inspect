import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useApiMetadata() {
  return useQuery({
    queryKey: ['api', 'metadata'],
    queryFn: api.getMetadata,
  });
}

export function useApiLiveness() {
  return useQuery({
    queryKey: ['api', 'liveness'],
    queryFn: api.getLiveness,
  });
}

export function useApiReadiness() {
  return useQuery({
    queryKey: ['api', 'readiness'],
    queryFn: api.getReadiness,
    retry: false,
  });
}
