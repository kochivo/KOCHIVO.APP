import { expect, it, vi } from 'vitest';
import { mealReceipt } from './meal-receipt';

vi.mock('server-only', () => ({}));

it('matches the precomputed extensions.hmac SQL fixture', () => {
  expect(mealReceipt('00000000-0000-0000-0000-000000000001', '2026-11-03', 'meal-receipt-test-secret'))
    .toBe('0f97948a28f604099a6ca5c641292e8cdf489cb3293b10bfe143f3521864c829');
});
