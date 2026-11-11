import { createElement } from 'react';
import type * as ReactModule from 'react';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { KoAccountLink } from '../ko-preview/components/ko-account-link';
import { koTeaserEnabled } from './config';
import { KoTeaser } from '../ko-preview/components/ko-teaser';
import { KoTeaserPanel } from '../ko-preview/components/ko-teaser-panel';
import { joinWaitlist } from './data/join-waitlist';
import { messages } from './messages';

const mocks = vi.hoisted(() => ({ claims: vi.fn(), insert: vi.fn(), query: vi.fn(), fetch: vi.fn(), path: '/player',
  interaction: false, states: [] as unknown[], cursor: 0, click: undefined as (() => void) | undefined,
}));
vi.mock('react', async original => {
  const react = await original<typeof ReactModule>();
  return { ...react, useState: (initial: unknown) => {
    if (!mocks.interaction) return react.useState(initial);
    const index = mocks.cursor++;
    if (!(index in mocks.states)) mocks.states[index] = initial;
    return [mocks.states[index], (value: unknown) => { mocks.states[index] = value; }];
  } };
});
vi.mock('@/ui/button', () => ({ Button: (props: ComponentProps<'button'>) => {
  mocks.click = props.onClick as (() => void) | undefined;
  return createElement('button', props);
} }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ headers: () => new Headers({ 'x-kochivo-path': mocks.path }) }));
vi.mock('next/navigation', () => ({ usePathname: () => mocks.path }));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: mocks.claims }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.query }) }) }),
}) }));
vi.mock('@/core/supabase/browser', () => ({ supabaseBrowser: () => ({ from: () => ({ insert: mocks.insert }) }) }));
beforeEach(() => {
  mocks.interaction = false; mocks.states = []; mocks.cursor = 0; mocks.click = undefined;
  vi.unstubAllEnvs();
  vi.stubGlobal('fetch', mocks.fetch);
  vi.stubEnv('KO_ENABLED', '');
  vi.stubEnv('KO_TEASER_ENABLED', '1');
  mocks.path = '/player';
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'user', is_anonymous: false } }, error: null });
  mocks.query.mockResolvedValue({ data: null, error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.fetch.mockClear();
});

it('requires the exact teaser flag', () => {
  expect(koTeaserEnabled()).toBe(true);
  vi.stubEnv('KO_TEASER_ENABLED', 'true');
  expect(koTeaserEnabled()).toBe(false);
});
it('shows a teaser for a permanent non-pilot and preserves joined state', async () => {
  mocks.query.mockResolvedValue({ data: { user_id: 'user' }, error: null });
  const result = await KoAccountLink({ player: true });
  expect(result?.type).toBe(KoTeaser);
  expect(result?.props).toMatchObject({ role: 'player', joined: true });
});
it.each(['/player/workout', '/player/workout/day', '/player/onboarding', '/player/onboarding/step'])('hides on %s', async path => {
  mocks.path = path;
  expect(await KoAccountLink({ player: true })).toBeNull();
});
it('hides when disabled, signed out, or anonymous', async () => {
  vi.stubEnv('KO_TEASER_ENABLED', '');
  expect(await KoAccountLink({})).toBeNull();
  vi.stubEnv('KO_TEASER_ENABLED', '1');
  for (const claims of [null, { sub: 'user', is_anonymous: true }]) {
    mocks.claims.mockResolvedValue({ data: { claims }, error: null });
    expect(await KoAccountLink({})).toBeNull();
  }
});
it('keeps the real widget for pilots', async () => {
  for (const key of ['KO_ENABLED', 'KO_GEMINI_PAID']) vi.stubEnv(key, '1');
  vi.stubEnv('KO_ORIGIN', 'https://example.com');
  vi.stubEnv('KO_APPROVAL_SECRET', 's'.repeat(32));
  vi.stubEnv('KO_PILOT_USER_IDS', 'user');
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test');
  const result = await KoAccountLink({});
  expect(result?.type).not.toBe(KoTeaser);
  expect(result?.props).toEqual({ role: 'captain' });
});
it.each(['ar', 'en'] as const)('renders the badge, examples, and joined states in %s', locale => {
  const t = createT(messages, locale);
  const render = (child: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(LocaleProvider, { locale }, child)).replaceAll('&#x27;', "'");
  const launcher = render(createElement(KoTeaser, { role: 'player', userId: 'user', joined: false }));
  expect(launcher).toContain(t('soon'));
  expect(launcher).toContain(t('teaserOpen'));
  expect(launcher).toContain('motion-reduce:animate-none');
  for (const role of ['captain', 'player'] as const) {
    for (const joined of [false, true]) {
      const html = render(createElement(KoTeaserPanel, { role, userId: 'user', joined, openerId: 'opener', onClose() {}, onJoined() {} }));
      for (const n of [1, 2, 3] as const) expect(html).toContain(t(`${role}${n}`));
      expect(html).toContain(t(joined ? 'joined' : 'join'));
      expect(html).toContain('sheet');
      expect(html).toContain(t('close'));
    }
  }
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it('joins without AI calls, treats duplicates as joined, and reports failure', async () => {
  expect(await joinWaitlist('user', 'player')).toBe(true);
  mocks.insert.mockResolvedValue({ error: { code: '23505' } });
  expect(await joinWaitlist('user', 'player')).toBe(true);
  mocks.insert.mockResolvedValue({ error: { code: '42501' } });
  expect(await joinWaitlist('user', 'player')).toBe(false);
  mocks.insert.mockRejectedValue(new Error('offline'));
  expect(await joinWaitlist('user', 'player')).toBe(false);
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it('shows optimistic confirmation, rolls back failure, and allows a retry', async () => {
  mocks.interaction = true;
  let settle: (value: { error: { code: string } | null }) => void = () => {};
  mocks.insert.mockReturnValue(new Promise(resolve => { settle = resolve; }));
  const joined = vi.fn();
  const t = createT(messages, 'ar');
  const render = () => {
    mocks.cursor = 0;
    return renderToStaticMarkup(createElement(KoTeaserPanel, {
      role: 'player', userId: 'user', joined: false, openerId: 'opener', onClose() {}, onJoined: joined,
    }));
  };
  expect(render()).toContain(t('join'));
  mocks.click?.();
  expect(render()).toContain(t('joined'));
  expect(joined).not.toHaveBeenCalled();
  settle({ error: { code: '42501' } });
  await Promise.resolve(); await Promise.resolve();
  const failed = render();
  expect(failed).toContain(t('joinError'));
  expect(failed).toContain(t('join'));
  mocks.insert.mockResolvedValue({ error: null });
  mocks.click?.();
  await Promise.resolve(); await Promise.resolve();
  expect(render()).toContain(t('joined'));
  expect(joined).toHaveBeenCalledOnce();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
