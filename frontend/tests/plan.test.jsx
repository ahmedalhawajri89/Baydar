import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { PlanLocked } from '@/features/billing/PlanLocked';
import { PlanUsage } from '@/features/billing/PlanUsage';
import * as planService from '@/services/plan';

vi.mock('@/services/plan', () => ({ getPlan: vi.fn() }));

/* Plans in the application (ADR-044). */

describe('a screen the plan does not include', () => {
  it('names the cheapest plan that has it, and points to the prices', () => {
    render(<PlanLocked feature="forecasts" />);

    expect(
      screen.getByText('The cash forecast comes with the Growth plan and up.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare the plans' })).toHaveAttribute(
      'href',
      '/pricing',
    );
  });
});

describe('the plan on the settings page', () => {
  it('shows each use against its limit, and an unlimited one in words', async () => {
    vi.mocked(planService.getPlan).mockResolvedValue({
      data: {
        plan: 'basic',
        limits: { channels: 3, users: 3, questions: 200, businesses: 1 },
        features: { forecasts: false, financing: false },
        usage: { channels: 3, users: 2, questions: 41, businesses: 1 },
        demo: false,
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <PlanUsage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Your plan: Basic')).toBeInTheDocument();
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
    expect(screen.getByText('41 of 200')).toBeInTheDocument();
  });
});
