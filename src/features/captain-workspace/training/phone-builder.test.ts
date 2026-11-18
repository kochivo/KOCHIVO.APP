import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { EditorHeader } from './editor-header';

afterEach(() => vi.unstubAllEnvs());

it('keeps the desktop send action and adds the counted phone action above the navigation', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const noop = () => {};
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(EditorHeader, {
    title: 'Strength', phoneDay: 'Day 2 of 3 · Push', playerId: 'player', template: false,
    status: 'saved', busy: false, disabled: false, onSend: noop, onAssign: noop, onRetry: noop,
  })));
  expect(html).toContain('Day 2 of 3 · Push');
  expect(html).toContain('max-md:fixed');
  expect(html).toContain('max-md:bottom-[var(--nav-clearance)]');
  expect(html).toMatch(/class="md:hidden">Save and send to players \(1\)/);
  expect(html).toMatch(/class="max-md:hidden">Send/);
});
