import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import Page from '@/app/[locale]/(captain)/captain/programs/[programId]/page';
import { ProgramBuilder } from '@/features/programs';
import { ProgramTrainingEntry } from '../server';

vi.mock('@/features/programs', () => ({ ProgramBuilder: () => createElement('div', null, 'builder'), programMessages: {} }));
vi.mock('../server', () => ({ ProgramTrainingEntry: () => createElement('section', null, 'training') }));
afterEach(() => vi.unstubAllEnvs());
const params = Promise.resolve({ programId: 'p', locale: 'ar' });
it.each([undefined, '0', 'true'])('keeps standalone flag-off output byte-identical for %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const before = createElement(ProgramBuilder, { key: 'p', programId: 'p' });
  const actual = await Page({ params });
  expect(actual).toEqual(before);
  expect(renderToStaticMarkup(actual)).toBe(renderToStaticMarkup(before));
});
it('selects the authorized unified server entry only for flag 1', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const actual = await Page({ params });
  expect(actual.type).toBe(ProgramTrainingEntry);
  expect(actual.props.programId).toBe('p');
});
