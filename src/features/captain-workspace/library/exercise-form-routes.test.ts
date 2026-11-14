import { afterEach, expect, it, vi } from 'vitest';
import NewPage from '../../../app/[locale]/(captain)/captain/library/exercises/new/page';
import EditPage from '../../../app/[locale]/(captain)/captain/library/exercises/[exerciseId]/edit/page';
import NewLoading from '../../../app/[locale]/(captain)/captain/library/exercises/new/loading';
import EditLoading from '../../../app/[locale]/(captain)/captain/library/exercises/[exerciseId]/edit/loading';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

vi.mock('next/dynamic', () => ({ default: () => 'exercise-form' }));
afterEach(() => vi.unstubAllEnvs());
it('passes the edit id and return destination from the async route props', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const page = await EditPage({ params: Promise.resolve({ exerciseId: 'own-id' }), searchParams: Promise.resolve({ returnTo: '/captain/programs/p' }) });
  expect(page.props).toEqual({ exerciseId: 'own-id', returnTo: '/captain/programs/p' });
  const fresh = await NewPage({ searchParams: Promise.resolve({ returnTo: '/captain/templates?plan=p' }) });
  expect(fresh.props).toEqual({ returnTo: '/captain/templates?plan=p' });
});
it('drops repeated return destinations and gates both screens behind the workspace flag', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect((await NewPage({ searchParams: Promise.resolve({ returnTo: ['/captain', '/captain/programs/p'] }) })).props.returnTo).toBeUndefined();
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  await expect(NewPage({ searchParams: Promise.resolve({}) })).rejects.toThrow();
  await expect(EditPage({ params: Promise.resolve({ exerciseId: 'id' }), searchParams: Promise.resolve({}) })).rejects.toThrow();
});
it('provides accessible loading states for both screens', () => {
  expect(renderToStaticMarkup(createElement(NewLoading))).toContain('role="status"');
  expect(renderToStaticMarkup(createElement(EditLoading))).toContain('role="status"');
});
