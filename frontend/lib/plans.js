/**
 * The plans, as the public pages present them (ADR-043).
 *
 * The prices were set by the owner on 2026-11-16: free for one sales
 * channel, then 79, 149 and 299 riyals a month. They exclude VAT.
 *
 * THE SERVER IS THE AUTHORITY on limits: backend/config/plans.php decides
 * what an account may do, and this file only describes it to a visitor who
 * has no account yet. The two are kept in step by hand, and each side's test
 * pins the same figures (tests/plans.test.js here, PlansTest on the server),
 * so changing one without the other fails a build.
 *
 * `null` is "no limit". Prices are decimal strings, like every amount the
 * front end shows: it formats money, it never computes it.
 */
export const PLAN_CURRENCY = 'SAR';

export const PLANS = [
  {
    key: 'free',
    price: '0',
    limits: { channels: 1, users: 1, questions: 20, businesses: 1 },
    features: { forecasts: false, financing: false },
  },
  {
    key: 'basic',
    price: '79',
    limits: { channels: 3, users: 3, questions: 200, businesses: 1 },
    features: { forecasts: false, financing: false },
  },
  {
    key: 'growth',
    price: '149',
    limits: { channels: null, users: 10, questions: 1000, businesses: 1 },
    features: { forecasts: true, financing: true },
    recommended: true,
  },
  {
    key: 'pro',
    price: '299',
    limits: { channels: null, users: null, questions: null, businesses: null },
    features: { forecasts: true, financing: true },
  },
];

/** The lowest paid price, for a line that says where paying starts. */
export const LOWEST_PAID_PRICE = PLANS.find((plan) => plan.price !== '0').price;
