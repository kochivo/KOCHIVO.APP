import { afterEach, expect, it, vi } from 'vitest';
import Page from '../../../app/[locale]/(captain)/captain/library/exercises/page';
import { ExerciseLibraryEntry } from '@/features/captain-workspace';

vi.mock('@/features/captain-workspace', () => ({ ExerciseLibraryEntry: () => null }));
afterEach(() => vi.unstubAllEnvs());

it('renders the feature only when the workspace flag is enabled', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(Page().type).toBe(ExerciseLibraryEntry);
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  expect(() => Page()).toThrow();
});
