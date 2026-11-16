import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Pricing } from '@/features/marketing/Pricing';
import { Zatca } from '@/features/marketing/Zatca';
import { ZATCA_DEADLINE, waveProgress } from '@/features/marketing/zatcaFacts';

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

/* The pricing and ZATCA pages (ADR-043). */

beforeEach(() => {
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});

describe('the pricing page', () => {
  it('compares the four plans in one table, with the prices the owner set', () => {
    render(<Pricing />);

    const table = screen.getByRole('table', { name: 'Plan comparison' });
    const headers = within(table).getAllByRole('columnheader');

    expect(headers.map((header) => header.textContent)).toEqual([
      expect.stringContaining('Free'),
      expect.stringMatching(/SAR\s79/),
      expect.stringMatching(/SAR\s149/),
      expect.stringMatching(/SAR\s299/),
    ]);
    expect(headers[2]).toHaveTextContent('Right for most stores');
  });

  it('reads each limit along its row, an unlimited one said in words', () => {
    render(<Pricing />);

    const row = screen.getByRole('row', { name: /Connected sales channels/ });
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['1', '3', 'No limit', 'No limit']);

    const forecast = screen.getByRole('row', { name: /Cash forecast/ });
    expect(
      within(forecast)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['—Not included', '—Not included', 'Included', 'Included']);
  });

  it('says the prices exclude VAT, and sends a free start to registration', () => {
    render(<Pricing />);

    expect(screen.getByText(/Prices are monthly and exclude VAT/)).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Plan comparison' });
    expect(within(table).getByRole('link', { name: 'Start free' })).toHaveAttribute(
      'href',
      '/register',
    );
  });
});

describe('the ZATCA page', () => {
  it('answers first: Baydar is not e-invoicing software', () => {
    render(<Zatca />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Is Baydar ZATCA compliant?',
    );
    expect(screen.getByText(/Baydar is not e-invoicing software/)).toBeInTheDocument();
    expect(
      screen.getByText('It does not issue tax invoices or simplified invoices.'),
    ).toBeInTheDocument();
  });

  it('links to ZATCA itself, in a new tab', () => {
    render(<Zatca />);

    const link = screen.getByRole('link', { name: 'ZATCA’s e-invoicing page' });
    expect(link).toHaveAttribute('href', 'https://zatca.gov.sa/en/E-Invoicing/Pages/default.aspx');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('counts the days to the wave deadline, and stops at zero', () => {
    expect(waveProgress(new Date('2026-11-16T10:00:00Z'))).toEqual({
      progress: expect.closeTo(115 / 192, 5),
      daysLeft: 77,
    });
    expect(waveProgress(new Date(`${ZATCA_DEADLINE}T12:00:00Z`)).daysLeft).toBe(0);
    expect(waveProgress(new Date('2027-06-01T00:00:00Z'))).toEqual({ progress: 1, daysLeft: 0 });
    expect(waveProgress(new Date('2026-01-01T00:00:00Z')).progress).toBe(0);
  });
});
