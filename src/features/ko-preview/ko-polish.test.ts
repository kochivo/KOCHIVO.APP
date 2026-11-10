import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { LocaleProvider } from '@/core/i18n/client';
import { messages as accountMessages } from '../ko-account/messages';
import { planIntent } from '../ko-account/intents';
import { selectKoTool } from '../ko-agent/gemini';
import { koVoiceRule } from '@/features/ko-agent';
import { messages } from './messages';
import { KoAvatar } from '@/ui/ko-avatar';
import { KoPanel } from './components/ko-panel';
import { KoWidget } from './components/ko-widget';
import { KoMessage } from './components/ko-message';
import { KoTyping } from './components/ko-typing';

afterEach(() => vi.unstubAllGlobals());

it('sends the shared Egyptian voice rule with both Gemini requests', async () => {
  const prompts: string[] = [];
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { systemInstruction: { parts: { text: string }[] } };
    prompts.push(body.systemInstruction.parts[0]?.text ?? '');
    return Response.json({ candidates: [{ content: { parts: [{ functionCall: { name: 'clarify', args: { question: 'قولّي عايز إيه؟' } } }] } }] });
  };
  vi.stubGlobal('fetch', fetcher);
  await selectKoTool('captain', { text: 'ساعدني' }, 'test', undefined, fetcher);
  await planIntent('captain', { text: 'ساعدني' }, 'test', new AbortController().signal);
  expect(prompts).toHaveLength(2);
  for (const prompt of prompts) expect(prompt).toContain(koVoiceRule);
});

it.each(['ar', 'en'] as const)('renders a small launcher, accessible typing and directional bubbles (%s)', locale => {
  const render = (child: ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale }, child));
  expect(render(createElement(KoWidget, { role: 'captain' }))).toContain('size-13');
  const typing = render(createElement(KoTyping));
  expect(typing).toContain('role="status"');
  expect(typing).toContain(locale === 'ar' ? 'ثانية واحدة…' : 'KO is working on your request…');
  expect(typing.match(/ko-typing/g)).toHaveLength(3);
  expect(typing).toContain('motion-reduce:animate-none');
  const ko = render(createElement(KoMessage, { speaker: 'ko', text: 'hello' }));
  const user = render(createElement(KoMessage, { speaker: 'user', text: 'hello' }));
  expect(ko).toContain('self-start');
  expect(ko).toContain('size-6');
  expect(user).toContain('self-end');
  expect(user).not.toContain('<img');
  expect(ko).toContain('dir="auto"');
  expect(user).toContain('motion-reduce:animate-none');
});

it('keeps KO copy colloquial and free of emoji', () => {
  for (const dictionary of [messages, accountMessages]) {
    for (const text of Object.values(dictionary.ar)) {
      expect(text).not.toMatch(/يرجى|الرجاء|سوف|أريد|لم /u);
    }
    for (const locale of ['ar', 'en'] as const) {
      for (const text of Object.values(dictionary[locale])) expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  }
});

it.each(['ar', 'en'] as const)('renders a calm header and reduced motion support (%s)', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(KoPanel, {
    role: 'captain', expression: 'welcome', onExpression() {}, onClose() {}, openerId: 'opener', interactive: true,
  })));
  expect(html).toContain(locale === 'ar' ? 'مساعدك في Kochivo' : 'Your Kochivo coach');
  expect(html).toContain('glass-strong');
  expect(html).toContain('motion-reduce:');
  expect(html).not.toMatch(/(?:ml-|mr-|pl-|pr-|text-left)/);
});

it('disables idle motion by default', () => {
  const html = renderToStaticMarkup(createElement(KoAvatar, { expression: 'welcome' }));
  expect(html).toContain('motion-reduce:');
  expect(html).not.toContain('ko-breathe');
});
