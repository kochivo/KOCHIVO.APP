import { expect, it } from 'vitest';
import { freezeAccess } from './data/freeze-access';

it('clears the waiting room and extends access from the captain’s midnight', () => {
  const row = { frozen_at: '2026-11-03T17:00:00Z', frozen_until: '2026-11-06', access_until: '2026-11-04' };
  expect(freezeAccess(row, new Date('2026-11-05T14:59:59Z'), 'Asia/Tokyo'))
    .toEqual({ frozenAt: row.frozen_at, accessUntil: '2026-11-04' });
  expect(freezeAccess(row, new Date('2026-11-05T15:00:00Z'), 'Asia/Tokyo'))
    .toEqual({ frozenAt: null, accessUntil: '2026-11-06' });
});
