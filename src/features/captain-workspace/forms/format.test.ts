import { expect, it } from 'vitest';
import { formSummary } from './format';
import type { PlayerForm } from './adapter';

const form: PlayerForm = { snapshot: { source: { kind: 'checkin', id: 'new', at: '2026-11-11T12:00:00Z' }, facts: {} },
  previous: { source: { kind: 'checkin', id: 'old', at: '2026-11-04T12:00:00Z' }, facts: {} },
  comparison: [], reviewedAt: null, reply: null, photoCount: 0, bodyFat: null };
it('summarizes neutral changes and newly answered fields rather than claiming no change', () => {
  expect(formSummary({ ...form, comparison: [{ key: 'weight', value: 81, previousValue: 82, delta: -1, direction: 'same' }] }, 'en')).toBe('Current weight: -1');
  expect(formSummary({ ...form, comparison: [{ key: 'note', value: 'Changed', direction: 'new' }] }, 'en')).toBe('Latest note: Changed');
});
it('keeps equal answers neutral and prioritizes added injuries', () => {
  expect(formSummary({ ...form, comparison: [{ key: 'injuries', value: ['knee'], previousValue: ['knee'], direction: 'same' }] }, 'en')).toBe('Same as before');
  expect(formSummary({ ...form, comparison: [{ key: 'weight', value: 81, previousValue: 82, delta: -1, direction: 'better' },
    { key: 'injuries', value: ['knee'], previousValue: ['none'], direction: 'worse' }] }, 'en')).toBe('Injuries: Knee');
});
it('summarizes body-fat-only changes', () => {
  expect(formSummary({ ...form, bodyFat: 19, previousBodyFat: 20 }, 'en')).toBe('Body fat: -1');
});
