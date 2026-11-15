import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { Disclosure } from '@/ui/disclosure';
import { createT } from '@/core/i18n/messages';
import { messages } from './components/editor/workspace/messages';

it.each(['ar', 'en'] as const)('keeps the meal editor panels labelled and expandable in %s', locale => {
  const source = readFileSync(new URL('./components/editor/player-editor.tsx', import.meta.url), 'utf8');
  const t = createT(messages, locale);
  for (const key of ['more', 'library'] as const) {
    expect(source).toContain(`<Disclosure label={t('${key}')}`);
    for (const open of [false, true]) {
      const html = renderToStaticMarkup(createElement(Disclosure, { label: t(key), open }, 'Body'));
      for (const cue of [t(key), `aria-expanded="${open}"`, 'lucide-chevron-down', 'press', 'cursor-pointer', 'focus-visible:ring-2']) expect(html).toContain(cue);
      expect(html.includes('rotate-180')).toBe(open);
      expect(html.includes('open=""')).toBe(open);
    }
  }
});
