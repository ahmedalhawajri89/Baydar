import { api } from '@/lib/apiClient';

/** The business's plan, its limits and what is used against them (ADR-044). */
export function getPlan() {
  return api.get('/plan');
}
