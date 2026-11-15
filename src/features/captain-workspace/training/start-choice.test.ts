import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { StartChoice } from './start-choice';

vi.mock('@/features/programs', () => ({ trainingTemplates: vi.fn() }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: [{ id: 'template', title: 'Strength' }], error: null }) }));
const props = { templates: true, onTemplates: () => {}, onStart: () => {}, busy: false };

it('shows the selected template and direction chevron in the player sheet', () => {
  const html = renderToStaticMarkup(createElement(StartChoice, { ...props, selectedId: 'template' }));
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('dir-icon');
  expect(html).toContain('lucide-chevron-down');
  expect(html).toContain('Strength');
});

it('keeps immediate-start mode while giving every template an opening cue', () => {
  const html = renderToStaticMarkup(createElement(StartChoice, props));
  expect(html).not.toContain('aria-pressed');
  expect(html).toContain('dir-icon');
  expect(html).toContain('lucide-chevron-down');
  expect(html).toContain('Strength</span>');
});
