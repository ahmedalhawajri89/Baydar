import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecurringExpenses } from '@/features/catalog/RecurringExpenses';
import * as catalog from '@/services/catalog';

let abilities = ['expenses.view', 'expenses.create', 'expenses.delete'];

vi.mock('@/services/catalog', () => ({
  listRecurringExpenses: vi.fn(),
  createRecurringExpense: vi.fn(),
  deleteRecurringExpense: vi.fn(),
}));

vi.mock('@/features/admin/useAdmin', () => ({
  useExpenseCategories: () => ({ categories: [{ id: 3, name: 'Rent' }] }),
}));

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ can: (ability) => abilities.includes(ability) }),
}));

/* Expenses that come back every month (ADR-041). */

const RULE = {
  id: 9,
  description: 'Shop rent',
  amount: '1200.000',
  vendor: null,
  day_of_month: 1,
  starts_on: '2027-01-01',
  ends_on: null,
  category: { id: 3, name: 'Rent', slug: 'rent' },
};

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <RecurringExpenses />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  abilities = ['expenses.view', 'expenses.create', 'expenses.delete'];
  vi.mocked(catalog.listRecurringExpenses).mockReset().mockResolvedValue({ data: [RULE] });
  vi.mocked(catalog.deleteRecurringExpense).mockReset().mockResolvedValue(null);
});

describe('RecurringExpenses', () => {
  it('lists each rule with its day', async () => {
    renderCard();

    expect(await screen.findByText('Shop rent')).toBeInTheDocument();
    expect(screen.getByText(/Every month on day 1/)).toBeInTheDocument();
  });

  it('asks before stopping a rule, then stops it', async () => {
    renderCard();

    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Months already recorded stay');

    await userEvent.click(screen.getByRole('button', { name: 'Stop it' }));
    expect(catalog.deleteRecurringExpense).toHaveBeenCalledWith(9, expect.anything());
  });

  it('offers neither adding nor stopping to a role that may only read', async () => {
    abilities = ['expenses.view'];
    renderCard();

    await screen.findByText('Shop rent');
    expect(screen.queryByRole('button', { name: 'Add a monthly expense' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();
  });
});
