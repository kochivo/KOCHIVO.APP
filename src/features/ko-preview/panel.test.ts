import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { KoPanel } from './components/ko-panel';
import { KoPreview } from './components/ko-preview';
import { messages } from './messages';
import { createT } from '@/core/i18n/messages';

it.each(['ar', 'en'] as const)('shows truthful role-specific teaser copy and no chat submission in %s', locale => {
  const t = createT(messages, locale);
  for (const role of ['captain', 'player'] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(KoPanel, {
      role, expression: 'thinking', onExpression() {}, onClose() {}, openerId: 'opener',
    })));
    expect(html).toContain(t('status'));
    expect(html).toContain(t(role));
    expect(html).not.toContain(t(role === 'captain' ? 'player' : 'captain'));
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/<form|<textarea|type="submit"/);
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  }
});

it('renders no KO during server rendering, including production builds', () => {
  expect(renderToStaticMarkup(createElement(KoPreview, { role: 'captain' }))).toBe('');
});

it('offers a text composer and microphone on the explicit demo only', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(KoPanel, {
    role: 'captain', expression: 'welcome', onExpression() {}, onClose() {}, openerId: 'opener', interactive: true,
  })));
  expect(html).toContain('data-ko-chat');
  expect(html).toContain('type="submit"');
  expect(html).toContain('aria-label="Record a voice note"');
});

it('renders a full-height account log and a decorative grabber', () => {
  const t = createT(messages, 'en');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(KoPanel, {
    role: 'player', account: true, expression: 'welcome', onExpression() {}, onClose() {}, openerId: 'opener',
  })));
  const log = html.match(/<div role="log"[^>]*>/)?.[0];
  expect(log).toContain('flex-1');
  expect(log).toContain('min-h-0');
  expect(log).not.toContain('max-h-60');
  expect(html).toMatch(/aria-hidden="true" class="[^"]*h-1 w-10 rounded-full bg-line/);
  for (const label of ['chatInput', 'mealPhoto', 'recordVoice', 'chatSend'] as const) {
    const control = html.split('<').find(tag => tag.includes(`aria-label="${t(label)}"`));
    expect(control).toContain('min-h-14');
  }
  const close = html.split('<').find(tag => tag.includes(`aria-label="${t('close')}"`));
  expect(close).toContain('min-h-12');
  expect(close).toContain('min-w-12');
});
