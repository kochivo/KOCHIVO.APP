import { createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import Page from '@/app/[locale]/(captain)/captain/templates/page';
import { TemplatesScreen } from '@/features/templates';
import { TemplateTrainingEntry } from '@/features/captain-workspace/server';

vi.mock('@/features/templates', () => ({ TemplatesScreen: () => null, templateMessages: {} }));
vi.mock('@/features/captain-workspace/server', () => ({ TemplateTrainingEntry: () => null }));
afterEach(() => vi.unstubAllEnvs());
it.each(['0', '', 'true'])('keeps flag-off library output identical despite a template query with flag %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const element = await Page({ searchParams: Promise.resolve({ plan: 'template' }) });
  expect(element).toEqual(createElement(TemplatesScreen));
});
it('opens the shared template entry only for an enabled template query', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(await Page({ searchParams: Promise.resolve({ plan: 'template' }) }))
    .toEqual(createElement(TemplateTrainingEntry, { planId: 'template' }));
  expect((await Page({})).type).not.toBe(TemplateTrainingEntry);
});
