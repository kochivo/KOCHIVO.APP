import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { Money } from './money';
import { CaptainHome } from './captain-home';
import { initialState } from './state';

it.each(['ar', 'en'] as const)('keeps every demo row action compact in %s', locale => {
  for (const view of [Money, CaptainHome]) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(view, {
      state: initialState(0), dispatch() {}, act() {}, now: () => 0,
    })));
    const actions = html.match(/<span class="shrink-0">[\s\S]*?<\/button><\/span>/g) ?? [];
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) expect(action).not.toContain('w-full');
  }
});
it('reserves safe-area clearance for the resume button when the guide is minimized', () => {
  const screen = readFileSync(new URL('./guided-screen.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('./guided.css', import.meta.url), 'utf8');
  expect(screen).toContain('data-guide-state={state.guide}');
  expect(css).toMatch(/\.demo-shell\[data-guide-state[^}]+padding-block-end:\s*calc\(var\(--spacing-touch\)\s*\+\s*var\(--spacing-card-gap\)\s*\+\s*var\(--demo-page-x\)\s*\+\s*var\(--safe-bottom/);
});
