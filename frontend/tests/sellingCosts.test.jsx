import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrderSellingCosts } from '@/features/orders/OrderSellingCosts';
import * as ordersService from '@/services/orders';

let abilities = ['orders.update'];

vi.mock('@/services/orders', () => ({ setShippingCost: vi.fn() }));

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ can: (ability) => abilities.includes(ability) }),
}));

/*
 * What it cost to sell one order (ADR-040). Every figure is the server's;
 * the screen only shows them, and lets the carrier's real bill replace the
 * estimate.
 */

function Row({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

const ORDER = {
  id: 7,
  status: 'fulfilled',
  payment_fee_amount: '14.100',
  channel_fee_amount: '10.000',
  shipping_cost: null,
  contribution_profit: '95.900',
};

function renderCosts(order = ORDER) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <dl>
        <OrderSellingCosts order={order} Row={Row} />
      </dl>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  abilities = ['orders.update'];
  vi.mocked(ordersService.setShippingCost).mockReset().mockResolvedValue({ data: ORDER });
});

describe('OrderSellingCosts', () => {
  it('shows nothing to a role the server sent no costs to', () => {
    const { container } = renderCosts({ id: 7, status: 'fulfilled' });

    expect(container.querySelector('dl')).toBeEmptyDOMElement();
  });

  it('shows the fees, an unknown shipping cost as unknown, and the server’s profit', () => {
    renderCosts();

    expect(screen.getByText('Payment fees')).toBeInTheDocument();
    expect(screen.getByText('Not known')).toBeInTheDocument();
    expect(screen.getByText('Profit after selling costs')).toBeInTheDocument();
    expect(screen.getByText(/95\.9/)).toBeInTheDocument();
  });

  it('sends the carrier’s bill the owner types in', async () => {
    renderCosts();

    await userEvent.click(screen.getByRole('button', { name: 'Correct' }));
    await userEvent.type(screen.getByLabelText('What the carrier charged for this order'), '27.5');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(ordersService.setShippingCost).toHaveBeenCalledWith(7, '27.5');
  });

  it('offers no correction to a role that cannot edit orders', () => {
    abilities = [];
    renderCosts();

    expect(screen.queryByRole('button', { name: 'Correct' })).not.toBeInTheDocument();
  });
});
