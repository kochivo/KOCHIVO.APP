import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { QuestionToggle } from './components/question-toggle';
import { QuestionRules } from './components/question-rules';
import { newQuestion } from './model';
import { selectPosition } from './components/select-position';

afterEach(() => vi.unstubAllEnvs());

it('gives the off switch a visible bordered track and contrasting knob', () => {
  const html = renderToStaticMarkup(createElement(QuestionToggle, { label: 'Alert', checked: false, onChange() {} }));
  expect(html).toMatch(/aria-hidden="true" class="[^"]*border border-line/);
  expect(html).toContain('bg-muted');
});

it.each(['egyptian', 'standard'] as const)('shows a surfaced alert input with an Arabic placeholder (%s)', style => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const question = { ...newQuestion('form', 0), type: 'number' as const, alert_on: { operator: 'lt' as const, value: 6 } };
  const html = renderToStaticMarkup(createElement(QuestionRules, { question, locale: 'ar', style, onChange() {} }));
  expect(html).toMatch(/<input[^>]*placeholder="اكتب القيمة"[^>]*class="[^"]*bg-surface[^>]*min-w-28/);
});

it.each([false, true])('fits the dropdown above or below in a short viewport (RTL: %s)', rtl => {
  const position = selectPosition({ x: 110, top: 150, bottom: 198, width: 200 }, 320, 240, rtl);
  const bottom = position.bottom ?? 240 - (position.top ?? 0) - position.maxBlockSize;
  const top = position.top ?? 240 - bottom - position.maxBlockSize;
  expect(top).toBeGreaterThanOrEqual(8);
  expect(bottom).toBeGreaterThanOrEqual(8);
});
