import { expect, it } from 'vitest';
import { safePainSwap, painLoad, painAffects } from './pain-safe-swap';

it.each([
  ['knee_r', { body_part: 'chest' }, false],
  ['knee_l', { body_part: 'UPPER LEGS' }, true],
  ['shoulder_l', { body_part: 'chest' }, true],
  ['other', { body_part: 'chest' }, true],
  ['knee_r', {}, true],
  ['knee_r', { body_part: null }, true],
  ['knee_r', { body_part: 'unrecognized' }, true],
  ['knee_r', { body_part: 'chest', stress: ['knee'] }, true],
  ['shoulder_r', { body_part: 'upper legs', stress: ['shoulder'] }, true],
  ['lower_back', { body_part: 'chest', stress: ['lower_back'] }, true],
] as const)('checks %s against exercise metadata %j', (area, exercise, affected) => {
  expect(painAffects(area, { body_part: 'body_part' in exercise ? exercise.body_part : undefined,
    stress: 'stress' in exercise ? [...exercise.stress] : undefined })).toBe(affected);
});

it('rejects knee-loading and unknown alternatives and keeps catalog order', () => {
  const rows = [{ id: 'unknown' }, { id: 'squat', body_part: 'upper legs', pattern: 'hinge', stress: [] },
    { id: 'curl', body_part: 'upper arms', pattern: 'hinge', stress: [] }, { id: 'press', body_part: 'chest', pattern: 'hinge', stress: [] }];
  expect(safePainSwap('knee_r', rows, 'hinge')?.id).toBe('curl');
  expect(safePainSwap('other', rows)).toBeUndefined();
  expect(safePainSwap('shoulder_l', [{ id: 'press', body_part: 'chest' }])).toBeUndefined();
});

it('applies hints through their inclusive expiry without compounding reductions', () => {
  expect(painLoad(100, { factor: 0.8, until: '2026-11-15' }, '2026-11-15')).toBe(80);
  expect(painLoad(100, { factor: 0, until: '2026-11-15' }, '2026-11-15')).toBe(0);
  expect(painLoad(100, { factor: 0.8, until: '2026-11-14' }, '2026-11-15')).toBe(100);
});
it('only offers catalog-tagged swaps accepted by the captain decision path', () => {
  const rows = [{ id: 'different', body_part: 'upper arms', pattern: 'biceps', stress: [] },
    { id: 'stress', body_part: 'upper arms', pattern: 'hinge', stress: ['knee'] },
    { id: 'safe', body_part: 'upper arms', pattern: 'hinge', stress: [] }];
  expect(safePainSwap('knee_r', rows, 'hinge')?.id).toBe('safe');
  expect(safePainSwap('knee_r', [{ id: 'missing', body_part: 'upper arms' }], 'hinge')).toBeUndefined();
});
it('never offers a swap that loads a previously reported area', () => {
  expect(safePainSwap('shoulder_l', [{ id: 'legs', body_part: 'upper legs', pattern: 'hinge', stress: [] }],
    'hinge', [{ area: 'knee_r' }])).toBeUndefined();
});
