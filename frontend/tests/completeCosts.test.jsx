import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CompleteCostsPage from '@/app/(app)/products/costs/page';
import * as catalog from '@/services/catalog';

let abilities = ['products.update', 'products.view_cost'];

vi.mock('@/services/catalog', () => ({ listMissingCosts: vi.fn(), completeCosts: vi.fn() }));

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ can: (ability) => abilities.includes(ability) }),
}));

/* Complete your costs (ADR-042). */

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <CompleteCostsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  abilities = ['products.update', 'products.view_cost'];
  vi.mocked(catalog.listMissingCosts)
    .mockReset()
    .mockResolvedValue({
      data: [{ id: 4, name: 'Oud oil', sku: 'OUD-1', price: '30.000', units_sold: 12, open_lines: 5 }],
      meta: { count: 1, limit: 200, lines_without_cost: 5 },
    });
  vi.mocked(catalog.completeCosts)
    .mockReset()
    .mockResolvedValue({ data: { products: 1, lines: 5, orders: 5 } });
});

describe('Complete your costs', () => {
  it('sends only the costs typed in, and reaches back to past orders by default', async () => {
    renderPage();

    await userEvent.type(await screen.findByLabelText('Oud oil: Your cost'), '9.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save costs' }));

    expect(catalog.completeCosts).toHaveBeenCalledWith(
      { costs: [{ product_id: 4, cost: '9.5' }], apply_to_past_orders: true },
      expect.anything(),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('5 past order lines updated');
  });

  it('says so when nothing was typed, and sends nothing', async () => {
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Save costs' }));

    expect(catalog.completeCosts).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('Enter at least one cost first.');
  });

  it('is closed to a role that cannot see cost', () => {
    abilities = ['products.update'];
    renderPage();

    expect(screen.queryByRole('button', { name: 'Save costs' })).not.toBeInTheDocument();
  });
});
