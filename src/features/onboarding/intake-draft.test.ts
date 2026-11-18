import { afterEach, expect, it, vi } from 'vitest';
import { readIntakeDraft } from './hooks/use-intake-draft';

const now = new Date('2026-06-01T12:00:00Z');
const sample = { birth_year: 1998, height_cm: 170, weight_kg: 75 };

afterEach(() => vi.unstubAllGlobals());

it('requires confirmation of sample values in older drafts', () => {
  vi.stubGlobal('window', { sessionStorage: { getItem: () => JSON.stringify(sample) } });
  const draft = readIntakeDraft(now);
  for (const field of Object.keys(sample)) expect(draft).not.toHaveProperty(field);
});

it('restores samples explicitly entered or confirmed in new drafts', () => {
  vi.stubGlobal('window', { sessionStorage: { getItem: () => JSON.stringify({ ...sample, measurementVersion: 1 }) } });
  expect(readIntakeDraft(now)).toMatchObject(sample);
});
