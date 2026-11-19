import { createElement } from 'react';
import type * as ReactModule from 'react';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import type * as ButtonModule from '@/ui/button';
import type * as IconButtonModule from '@/ui/icon-button';
import { KoAccountLink } from '../ko-preview/components/ko-account-link';
import { koAccountConfig, koTeaserEnabled } from './config';
import { KoTeaser } from '../ko-preview/components/ko-teaser';
import { KoTeaserPanel } from '../ko-preview/components/ko-teaser-panel';
import { joinWaitlist } from './data/join-waitlist';
import { messages } from './messages';

const mocks = vi.hoisted(() => ({ claims: vi.fn(), insert: vi.fn(), query: vi.fn(), fetch: vi.fn(), path: '/player',
  interaction: false, states: [] as unknown[], cursor: 0, click: undefined as (() => void) | undefined,
  close: undefined as (() => void) | undefined,
  effects: [] as Array<() => void | (() => void)>,
}));
vi.mock('react', async original => {
  const react = await original<typeof ReactModule>();
  return { ...react, useEffect: (effect: () => void | (() => void)) => {
    if (mocks.interaction) mocks.effects.push(effect);
    else react.useEffect(effect);
  }, useSyncExternalStore: (...args: Parameters<typeof react.useSyncExternalStore>) =>
    mocks.interaction ? args[1]() : react.useSyncExternalStore(...args),
  useState: (initial: unknown) => {
    if (!mocks.interaction) return react.useState(initial);
    const index = mocks.cursor++;
    if (!(index in mocks.states)) mocks.states[index] = initial;
    return [mocks.states[index], (value: unknown) => { mocks.states[index] = value; }];
  } };
});
vi.mock('@/ui/icon-button', async original => {
  const { IconButton } = await original<typeof IconButtonModule>();
  return { IconButton: (props: ComponentProps<typeof IconButton>) => {
    mocks.close = props.onClick as (() => void) | undefined;
    return createElement(IconButton, props);
  } };
});
vi.mock('@/ui/button', async original => ({ ...await original<typeof ButtonModule>(), Button: (props: ComponentProps<'button'>) => {
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
  mocks.interaction = false; mocks.states = []; mocks.cursor = 0; mocks.click = undefined; mocks.close = undefined; mocks.effects = [];
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
afterEach(() => vi.unstubAllGlobals());

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
it('opens the real widget to every signed-in account when the pilot list is *', async () => {
  for (const key of ['KO_ENABLED', 'KO_GEMINI_PAID']) vi.stubEnv(key, '1');
  vi.stubEnv('KO_ORIGIN', 'https://example.com');
  vi.stubEnv('KO_APPROVAL_SECRET', 's'.repeat(32));
  vi.stubEnv('KO_PILOT_USER_IDS', '*');
  vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test');
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'someone-else' } }, error: null });
  expect((await KoAccountLink({}))?.type).not.toBe(KoTeaser);
  mocks.claims.mockResolvedValue({ data: { claims: { sub: 'someone-else', is_anonymous: true } }, error: null });
  expect(await KoAccountLink({})).toBeNull();
  expect(koAccountConfig()?.pilots.has('anyone')).toBe(true);
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

it('uses a nonmodal corner card with the KO helmet, three examples and the waitlist action', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const child = createElement(KoTeaserPanel, {
    role: 'captain', userId: 'user', joined: false, openerId: 'opener', desktop: true, onClose() {}, onJoined() {},
  });
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', style: 'standard' }, child));
  expect(html).toContain('أمثلة على ما يمكنك طلبه');
  expect(html).toMatch(/(?:\/|%2F)ko-preview(?:\/|%2F)welcome\.png/);
  expect(html).toContain('end-page-x bottom-page-y');
  expect(html.match(/<li\b/g)).toHaveLength(3);
  expect(html).toContain('role="dialog"');
  expect(html).toContain(createT(messages, 'ar', 'standard')('join'));
  expect(html).not.toMatch(/<dialog|aria-modal|backdrop|blur/);
});

it.each(['close button', 'Escape'] as const)('dismisses the desktop card with %s and respects storage on remount', method => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  mocks.interaction = true;
  const storage = new Map<string, string>();
  const events = new EventTarget();
  vi.stubGlobal('window', {
    location: { href: 'https://example.com/captain' },
    matchMedia: () => ({ matches: true }),
    localStorage: { getItem: (key: string) => storage.get(key), setItem: (key: string, value: string) => storage.set(key, value) },
    addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
  });
  vi.stubGlobal('document', { activeElement: null, querySelector: () => null });
  const render = (userId = 'user') => {
    mocks.cursor = 0;
    mocks.effects = [];
    return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
      createElement(KoTeaser, { role: 'captain', userId, joined: false })));
  };
  expect(render()).toContain('data-ko-teaser-corner');
  expect(render()).toContain('aria-label="Close"');
  if (method === 'close button') {
    expect(mocks.close).toBeTypeOf('function');
    mocks.close?.();
  } else {
    // The corner's effect follows the launcher's lazy-load effect.
    const cleanup = mocks.effects.at(-1)?.();
    events.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Enter' }));
    expect(storage.size).toBe(0);
    events.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }));
    cleanup?.();
  }
  expect(storage.size).toBe(1);
  expect(render()).not.toContain('data-ko-teaser-corner');
  mocks.states = [];
  expect(render()).not.toContain('data-ko-teaser-corner');
  expect(render('other-user')).toContain('data-ko-teaser-corner');
});
