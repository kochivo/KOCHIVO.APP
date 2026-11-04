import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { StepBasics } from './components/step-basics';
import { StepSchedule } from './components/step-schedule';
import { StepHealth } from './components/step-health';
import { StepFood } from './components/step-food';
import { makeIntakeSchema } from './data/intake-schema';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { DayPicker } from './components/day-picker';

it('renders onboarding in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(DayPicker, { value: [], onChange: () => undefined })));
  expect(html).toContain('Days you can train');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});

it('translates every intake step, option and validation error in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement('div', null, ...[StepBasics, StepSchedule, StepHealth, StepFood].map((Screen, key) =>
      createElement(Screen, { key, draft: { medical: ['heart'] }, errors: {}, update: () => undefined, touch: () => undefined })))));
  expect(html).toContain('Milk');
  expect(html).toContain('Your age');
  expect(html).toContain('Consult a doctor');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
  const result = makeIntakeSchema(new Date('2026-11-03T10:00:00Z'), createT(messages, 'en')).stepSchemas.basics.safeParse({});
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.map(issue => issue.message)).toContain('Choose male or female');
    expect(result.error.issues.map(issue => issue.message).join(' ')).not.toMatch(/[\u0600-\u06ff]/u);
  }
});

