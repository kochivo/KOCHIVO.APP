import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const bars = [
  'captain-workspace/training/editor-header',
  'captain-workspace/components/mobile-actions',
  'roster/components/captain-frame-nav',
  'roster/components/invite-form',
  'settings/components/captain/save-bar',
  'onboarding/components/intake-wizard',
  'player-shell/components/start-gate-screen',
  'player-shell/components/captain-question',
  'workout/components/workout-overview',
  'workout/components/workout-set',
  'coach-page/components/public-dock',
  'programs/components/builder-header',
];

it.each(bars)('marks the bottom action in %s', bar => {
  expect(readFileSync(`src/features/${bar}.tsx`, 'utf8')).toContain('data-action-bar');
});

it('hides floating buttons while a phone action bar is present', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  expect(css).toMatch(/@media \(width < 48rem\)\s*\{\s*body:has\(\[data-action-bar\][^\n]*\[data-floating-fab\]\s*\{\s*display: none;/);
});

it('excludes the invite footer when its inline action takes over', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const invite = readFileSync('src/features/roster/components/invite-form.tsx', 'utf8');
  expect(invite.includes('data-action-bar="invite"') && invite.includes('min-[760px]:hidden')).toBe(true);
  expect(css.includes('[data-action-bar]:not([data-action-bar="invite"])')).toBe(true);
  expect(css).toMatch(/@media \(width < 760px\)\s*\{\s*body:has\(\[data-action-bar="invite"\]\) \[data-floating-fab\]\s*\{\s*display: none;/);
});
