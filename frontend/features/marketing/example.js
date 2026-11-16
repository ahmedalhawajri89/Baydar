/**
 * The one order the public page threshes (ADR-043).
 *
 * NOT INVENTED FOR THE PAGE. These are the figures of the hand calculation
 * the server's test suite holds Baydar to (backend/tests/Feature/Metrics/
 * SellingCostsTest.php): a 200 order from Salla, paid with Tamara, the
 * customer charged 10 for shipping the carrier billed 25, goods that cost 80,
 * and 50 of the month's rent against it. If that test's figures change, these
 * change with it, so the page never shows a profit the product would not.
 *
 * Every amount is the exact decimal string, never a sum worked out here: the
 * front end does no money arithmetic (ADR-013). `after` is what is left once
 * the step has been taken off, as the test asserts it.
 *
 * `share` is each step's part of the order, used only to size the slices of
 * the drawing; a slice is as large as the money it stands for. They are
 * fractions of the drawing, not of money, so plain numbers are right here.
 */
export const EXAMPLE_CURRENCY = 'SAR';

export const EXAMPLE_ORDER = '200.00';

export const EXAMPLE_PROFIT = '30.90';

export const EXAMPLE_STEPS = [
  { key: 'goods', amount: '80.00', after: '120.00', share: 0.4 },
  { key: 'paymentFee', amount: '14.10', after: '105.90', share: 0.0705 },
  { key: 'channelFee', amount: '10.00', after: '95.90', share: 0.05 },
  { key: 'shipping', amount: '15.00', after: '80.90', share: 0.075 },
  { key: 'rent', amount: '50.00', after: '30.90', share: 0.25 },
];

/** What is left, as a part of the drawing: 30.90 of 200. */
export const EXAMPLE_PROFIT_SHARE = 0.1545;
