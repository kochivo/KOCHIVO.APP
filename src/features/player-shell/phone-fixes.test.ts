import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const source = (path: string) => readFileSync(`src/${path}`, 'utf8');

it('reserves room above the navigation for floating controls and their tooltip', () => {
  const css = source('app/globals.css');
  expect(css).toContain('--player-content-clearance: max(var(--page-bottom-clearance), calc(var(--nav-clearance) + 0.5rem + 3.25rem + 3rem + var(--spacing-card-gap)))');
  expect(css).toContain('.player-content { padding-block-end: var(--player-content-clearance); }');
});

it('keeps an opaque safe-area strip above scrolling player content', () => {
  expect(source('features/player-shell/components/player-shell.tsx')).toContain('pointer-events-none fixed inset-x-0 top-0 z-40 h-[var(--safe-top)] bg-bg');
});

it('keeps the round home bell icon from shrinking inside button padding', () => {
  const bell = source('features/notifications/components/notification-bell.tsx');
  expect(bell).toContain('size-12 shrink-0 px-0');
  expect(bell).toContain('size-5 shrink-0');
  expect(bell).toContain("aria-label={t('title')}");
});

it('puts player identity above a wrapping action row in both expansion states', () => {
  const facts = source('features/captain-workspace/training/training-facts.tsx');
  expect(facts).toContain('min-w-0 basis-full');
  expect(facts).toContain('flex w-full min-w-0 flex-wrap items-center gap-stack');
  expect(facts).toContain('min-w-0 break-words font-display');
});
