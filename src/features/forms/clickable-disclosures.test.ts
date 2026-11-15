import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { V11QuestionCard } from './components/v11-question-card';
import type { Question } from './types';

const question: Question = { id: 'question', form_id: 'form', position: 0, label_ar: 'الوزن', label_en: 'Weight',
  type: 'number', required: true, options: [], maps_to: null, alert_on: null };

it.each(['ar', 'en'] as const)('shows the question chevron and exposes both expanded states in %s', locale => {
  for (const open of [false, true]) {
    const html = renderToStaticMarkup(createElement(V11QuestionCard, { question, locale, index: 0, count: 1, open,
      onToggle() {}, onChange() {}, onDelete() {}, onMove() {} }));
    expect(html).toContain(`aria-expanded="${open}"`);
    expect(html).toContain('aria-controls="question-question"');
    const trigger = html.slice(0, html.indexOf('</button>'));
    for (const cue of ['lucide-chevron-down', 'press', 'cursor-pointer', 'focus-visible:ring-2']) expect(trigger).toContain(cue);
    expect(trigger.includes('rotate-180')).toBe(open);
    expect(html.includes('id="question-question"')).toBe(open);
  }
});
