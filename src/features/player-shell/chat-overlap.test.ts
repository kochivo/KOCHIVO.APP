import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { messages } from './captain-messages';

const source = (path: string) => readFileSync(resolve(path), 'utf8');

it('scopes the composer and bubble styling to the workspace chat', () => {
  const css = source('src/features/player-shell/components/captain-chat.module.css');
  expect(css).toContain('.thread ol > li > div:has(> p)');
  expect(css).toContain('.thread ol > li:global(.self-end) > div:has(> p)');
  expect(css).toContain('.composer [data-chat-composer] input');
});

it('keeps the player chat composer above the bottom nav on phones with a home indicator', () => {
  const composer = source('src/features/chat/components/chat-composer.tsx');
  expect(composer).not.toContain("'bottom-24'");
  expect(composer).toMatch(/viewer === 'player' \? 'bottom-\[calc\(var\(--nav-clearance\)\+0\.5rem\)\]'/);
});

it('hides the floating KO button on the player chat, where the composer sits', () => {
  expect(source('src/features/ko-preview/components/ko-teaser.tsx')).toContain("path === '/player/captain'");
  expect(source('src/features/ko-preview/components/ko-account-widget.tsx')).toContain("path === '/player/captain'");
});

it('says since today instead of zero days on the first day', () => {
  expect(source('src/features/player-shell/components/captain-heading.tsx')).toContain("days === 0 ? t('sinceToday')");
  expect(messages.ar.sinceToday).toBe('كابتنك من النهارده');
  expect(messages.en.sinceToday).toBe('Your coach since today');
});
