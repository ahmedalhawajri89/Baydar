import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Landing } from '@/features/marketing/Landing';
import {
  EXAMPLE_ORDER,
  EXAMPLE_PROFIT,
  EXAMPLE_PROFIT_SHARE,
  EXAMPLE_STEPS,
} from '@/features/marketing/example';
import { preferredLocale } from '@/lib/i18n/config';
import { LOWEST_PAID_PRICE, PLANS } from '@/lib/plans';

let signedIn = false;

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: signedIn }),
}));

/* The public front page (ADR-043). */

beforeEach(() => {
  signedIn = false;
  // jsdom has no matchMedia; asking for less motion keeps GSAP out of it,
  // and the page must read in full without the animation anyway.
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});

const cents = (amount) => Math.round(Number(amount) * 100);

describe('the threshed order', () => {
  it('takes each step off what the one before left, ending on the profit', () => {
    let left = cents(EXAMPLE_ORDER);

    for (const step of EXAMPLE_STEPS) {
      left -= cents(step.amount);
      expect(cents(step.after)).toBe(left);
    }

    expect(left).toBe(cents(EXAMPLE_PROFIT));
  });

  it('draws every slice as large as its money, so the disc is the whole order', () => {
    for (const step of EXAMPLE_STEPS) {
      expect(step.share).toBeCloseTo(Number(step.amount) / Number(EXAMPLE_ORDER), 6);
    }

    const drawn = EXAMPLE_STEPS.reduce((sum, step) => sum + step.share, EXAMPLE_PROFIT_SHARE);
    expect(drawn).toBeCloseTo(1, 6);
  });
});

describe('the page', () => {
  it('says the argument in its one heading, and renders the finished ledger', () => {
    render(<Landing />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Your store tells you what you sold.');
    expect(heading).toHaveTextContent('Baydar tells you whether you made money.');

    // The markup is the end state: every cost named, the profit stated,
    // whether or not the animation ever runs.
    for (const name of [
      'Cost of the goods',
      'Tamara’s fee',
      'Salla’s commission',
      'Shipping',
      'The month’s expenses',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
    expect(screen.getByText('Your profit on this order')).toBeInTheDocument();
  });

  it('shows the product itself, in the reader’s language', () => {
    render(<Landing />);

    // Twice: the stacked list, and the tour wide screens with motion get.
    const images = screen.getAllByAltText(/The Baydar dashboard/);
    expect(images.length).toBe(2);
    for (const image of images) expect(image.getAttribute('src')).toContain('dashboard-en.webp');
  });

  it('offers the dashboard to someone already signed in, instead of a sign-in', () => {
    signedIn = true;
    render(<Landing />);

    const header = screen.getAllByRole('banner')[0];
    expect(within(header).getByRole('link', { name: 'Open your dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(within(header).queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('names every channel once for assistive technology, under the moving band', () => {
    render(<Landing />);

    const band = screen.getByRole('region', { name: 'Gathers your orders from' });
    expect(
      within(band)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Salla', 'Zid', 'Shopify', 'WooCommerce', 'Excel files', 'API']);
  });

  it('links to the prices and to the ZATCA answer', () => {
    render(<Landing />);

    expect(screen.getAllByRole('link', { name: 'Pricing' })[0]).toHaveAttribute('href', '/pricing');
    expect(screen.getAllByRole('link', { name: 'Baydar and ZATCA' })[0]).toHaveAttribute(
      'href',
      '/zatca',
    );
  });
});

describe('the first language a visitor sees', () => {
  it('follows the browser when it asks for Arabic', () => {
    expect(preferredLocale('ar-SA,ar;q=0.9,en;q=0.8')).toBe('ar');
    expect(preferredLocale('en-US,en;q=0.9,ar;q=0.8')).toBe('en');
  });

  it('honours the weights, not just the order', () => {
    expect(preferredLocale('en;q=0.4,ar;q=0.9')).toBe('ar');
  });

  it('falls back to the default for anything else, or nothing', () => {
    expect(preferredLocale('fr-FR,de;q=0.5')).toBe('en');
    expect(preferredLocale(null)).toBe('en');
    expect(preferredLocale('ar;q=0')).toBe('en');
  });
});

describe('the plans', () => {
  it('holds the prices the owner set, lowest paid first', () => {
    expect(PLANS.map((plan) => [plan.key, plan.price])).toEqual([
      ['free', '0'],
      ['basic', '79'],
      ['growth', '149'],
      ['pro', '299'],
    ]);
    expect(LOWEST_PAID_PRICE).toBe('79');
  });

  it('holds the limits the server enforces (backend/config/plans.php)', () => {
    expect(Object.fromEntries(PLANS.map((plan) => [plan.key, plan.limits]))).toEqual({
      free: { channels: 1, users: 1, questions: 20, businesses: 1 },
      basic: { channels: 3, users: 3, questions: 200, businesses: 1 },
      growth: { channels: null, users: 10, questions: 1000, businesses: 1 },
      pro: { channels: null, users: null, questions: null, businesses: null },
    });
  });
});
