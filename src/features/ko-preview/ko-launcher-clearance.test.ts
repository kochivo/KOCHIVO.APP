import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { KoTeaser } from './components/ko-teaser';
import { KoWidget } from './components/ko-widget';
import { messages as previewMessages } from './messages';
import { koEntryMessages } from '@/features/ko-entry';

vi.mock('next/navigation', () => ({ usePathname: () => '/captain' }));

beforeEach(() => vi.unstubAllEnvs());
afterEach(() => vi.unstubAllEnvs());

const render = (child: ReturnType<typeof createElement>, locale: 'ar' | 'en' = 'ar') =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, child));

function launcherButton(html: string) {
  const button = html.split('<button').find(tag => tag.includes('data-floating-fab'));
  expect(button).toBeDefined();
  return button as string;
}

it.each(['ar', 'en'] as const)('keeps the captain widget launcher fixed above the nav, labelled and at least 48px in %s', locale => {
  const html = render(createElement(KoWidget, { role: 'captain', account: true }), locale);
  const button = launcherButton(html);
  expect(button).toContain('fixed');
  expect(button).toContain('start-[max(1rem,var(--safe-start))]');
  expect(button).toContain('bottom-[calc(var(--nav-clearance)+0.5rem)]');
  expect(button).toContain('min-[760px]:end-20');
  expect(button).toContain('lg:bottom-6');
  expect(button).toContain('size-13');
  expect(button).toContain('min-h-12');
  expect(button).toContain('min-w-12');
  expect(button).toContain('aria-haspopup="dialog"');
  expect(button).toContain(`aria-label="${createT(previewMessages, locale)('accountChatTitle')}"`);
  expect(button).not.toMatch(/left-|right-/);
});

it.each(['ar', 'en'] as const)('keeps the captain teaser launcher fixed above the nav, labelled and at least 48px in %s', locale => {
  const html = render(createElement(KoTeaser, { role: 'captain', userId: 'user', joined: false }), locale);
  const button = launcherButton(html);
  expect(button).toContain('fixed');
  expect(button).toContain('start-[max(1rem,var(--safe-start))]');
  expect(button).toContain('bottom-[calc(var(--nav-clearance)+0.5rem)]');
  expect(button).toContain('min-[760px]:end-20');
  expect(button).toContain('size-13');
  expect(button).toContain('min-h-12');
  expect(button).toContain('min-w-12');
  expect(button).toContain('aria-haspopup="dialog"');
  expect(button).toContain(`aria-label="${createT(koEntryMessages, locale)('teaserOpen')}"`);
  expect(button).not.toMatch(/left-|right-/);
});

it('moves both captain launchers to the end side at nav clearance on workspace phones', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  for (const html of [
    render(createElement(KoWidget, { role: 'captain', account: true })),
    render(createElement(KoTeaser, { role: 'captain', userId: 'user', joined: false })),
  ]) {
    const button = launcherButton(html);
    expect(button).toContain('max-md:start-auto!');
    expect(button).toContain('max-md:end-[max(var(--spacing-page-x),var(--safe-end))]!');
    expect(button).toContain('max-md:bottom-[var(--nav-clearance)]!');
    expect(button).toContain('max-md:size-12');
  }
});

it('keeps the shared captain clearance taller than the launcher in every position', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  // The token accounts for the nav, the gap under it, the 3.25rem (size-13)
  // launcher, the tooltip above it and a card gap, so page content padded
  // with it can always scroll clear of the fixed launcher.
  expect(css).toContain('calc(var(--nav-clearance) + 0.5rem + 3.25rem + 3rem + var(--spacing-card-gap))');
  expect(css).toContain('.captain-content { padding-block-end: var(--captain-content-clearance); }');
  expect(css).toContain('--captain-content-clearance: calc(1.5rem + 3.25rem + 3rem + var(--spacing-card-gap));');
});

// P1: the player launchers sit in exactly the same phone spot as the captain
// ones (fixed, start side, above the nav, 52px), but they never take the
// captain desktop shift to the end side — there is no captain workspace on
// player screens, and the teaser desktop branch is captain-gated.
it.each(['ar', 'en'] as const)('keeps the player widget launcher fixed above the nav, labelled and at least 48px in %s', locale => {
  const html = render(createElement(KoWidget, { role: 'player', account: true }), locale);
  const button = launcherButton(html);
  expect(button).toContain('fixed');
  expect(button).toContain('start-[max(1rem,var(--safe-start))]');
  expect(button).toContain('bottom-[calc(var(--nav-clearance)+0.5rem)]');
  expect(button).toContain('lg:bottom-6');
  expect(button).toContain('size-13');
  expect(button).toContain('min-h-12');
  expect(button).toContain('min-w-12');
  expect(button).toContain('aria-haspopup="dialog"');
  expect(button).toContain(`aria-label="${createT(previewMessages, locale)('accountChatTitle')}"`);
  expect(button).not.toContain('end-20');
  expect(button).not.toMatch(/left-|right-/);
});

it.each(['ar', 'en'] as const)('keeps the player teaser launcher fixed above the nav, labelled and at least 48px in %s', locale => {
  const html = render(createElement(KoTeaser, { role: 'player', userId: 'user', joined: false }), locale);
  const button = launcherButton(html);
  expect(button).toContain('fixed');
  expect(button).toContain('start-[max(1rem,var(--safe-start))]');
  expect(button).toContain('bottom-[calc(var(--nav-clearance)+0.5rem)]');
  expect(button).toContain('size-13');
  expect(button).toContain('min-h-12');
  expect(button).toContain('min-w-12');
  expect(button).toContain('aria-haspopup="dialog"');
  expect(button).toContain(`aria-label="${createT(koEntryMessages, locale)('teaserOpen')}"`);
  expect(button).not.toContain('end-20');
  expect(button).not.toContain('end-page-x');
  expect(button).not.toMatch(/left-|right-/);
});

it('never enables the teaser desktop branch for players', () => {
  const teaser = readFileSync(new URL('./components/ko-teaser.tsx', import.meta.url), 'utf8');
  expect(teaser).toContain("const captainPhone = role === 'captain' && captainWorkspaceEnabled();");
  expect(teaser).toContain('captainPhone ? subscribeViewport : ignoreViewport');
});

// P1: the shared player clearance is the same token as the captain one, and
// the player layout — the one place that owns every player page, including
// the shell states that never render its inner div — applies it once.
it('keeps the shared player clearance taller than the launcher and applied once', () => {
  const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8');
  expect(css).toContain('calc(var(--nav-clearance) + 0.5rem + 3.25rem + 3rem + var(--spacing-card-gap))');
  expect(css).toContain('.player-content { padding-block-end: var(--player-content-clearance); }');
  expect(css).toContain('--player-content-clearance: max(var(--page-bottom-clearance), calc(var(--nav-clearance) + 0.5rem + 3.25rem + 3rem + var(--spacing-card-gap)));');
  const layout = readFileSync(new URL('../../app/[locale]/(player)/player/layout.tsx', import.meta.url), 'utf8');
  expect(layout).toContain('className="player-content"');
  expect(layout).toContain('/^\\/player\\/(?:workout|onboarding)(?:\\/|$)/');
  const shell = readFileSync(new URL('../../features/player-shell/components/player-shell.tsx', import.meta.url), 'utf8');
  expect(shell).not.toContain('pb-[var(--player-content-clearance)]');
});

// The desktop branch is client-only (the server snapshot is 'phone', see
// use-teaser-desktop), so no SSR render can reach it; assert on the source
// instead. On workspace desktop the teaser button sits at the end side
// (bottom-left in RTL) above the page edge, and its opened corner panel
// sits in exactly the same spot, so the panel never traps the user away
// from the button that opened it.
it('keeps the teaser desktop branch fixed at the end side, labelled and at least 48px', () => {
  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const teaser = read('./components/ko-teaser.tsx');
  expect(teaser).toContain("'fixed end-page-x bottom-page-y z-30 grid size-13 min-h-12 min-w-12");
  expect(teaser).not.toMatch(/fixed end-page-x bottom-page-y[^']*(?:left-|right-)/);
  const corner = read('./components/ko-teaser-corner.tsx');
  expect(corner).toContain('fixed end-page-x bottom-page-y z-50');
});

