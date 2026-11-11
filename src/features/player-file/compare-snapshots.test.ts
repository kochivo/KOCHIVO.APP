import { expect, it } from 'vitest';
import { compareSnapshots } from './compare-snapshots';
import type { FactValues, Snapshot } from './model';

const snapshot = (facts: Partial<FactValues>): Snapshot => ({
  source: { kind: 'checkin', id: 'form', at: '2026-11-11T12:00:00Z' }, facts,
});
it.each([[76, 81, 'better'], [76, 83, 'worse'], [90, 83, 'better'], [90, 81, 'worse']] as const)(
  'compares weight toward target %s', (targetWeight, weight, direction) => {
    expect(compareSnapshots(snapshot({ weight, targetWeight }), snapshot({ weight: 82 }))[0])
      .toMatchObject({ key: 'weight', value: weight, previousValue: 82, delta: weight - 82, direction });
  });
it('uses weight goal direction for waist and keeps unknown goals neutral', () => {
  expect(compareSnapshots(snapshot({ waist: 88, targetWeight: 76 }), snapshot({ waist: 90, weight: 82 }))[0]?.direction).toBe('better');
  expect(compareSnapshots(snapshot({ waist: 92, targetWeight: 90 }), snapshot({ waist: 90, weight: 82 }))[0]?.direction).toBe('better');
  expect(compareSnapshots(snapshot({ weight: 81 }), snapshot({ weight: 82 }))[0]?.direction).toBe('same');
});
it('flags added injuries, ignoring the none sentinel and array order', () => {
  expect(compareSnapshots(snapshot({ injuries: ['knee'] }), snapshot({ injuries: ['none'] }))[0]?.direction).toBe('worse');
  expect(compareSnapshots(snapshot({ injuries: ['knee', 'shoulder'] }), snapshot({ injuries: ['shoulder', 'knee'] }))[0]?.direction).toBe('same');
  expect(compareSnapshots(snapshot({ injuries: ['knee'] }), snapshot({ weight: 82 }))[0]?.direction).toBe('worse');
});
it('keeps equal values the same and other changes neutral', () => {
  expect(compareSnapshots(snapshot({ weight: 82, note: 'changed' }), snapshot({ weight: 82, note: 'old' })))
    .toMatchObject([{ direction: 'same', delta: 0 }, { direction: 'same' }]);
});
it('marks answered keys in the first form as new and skips unanswered keys', () => {
  expect(compareSnapshots(snapshot({ weight: 82, note: undefined }), null))
    .toEqual([{ key: 'weight', value: 82, direction: 'new' }]);
});
