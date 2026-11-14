import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { RowLink } from './row-link';
import { Disclosure } from './disclosure';
import { EditInPlace } from './edit-in-place';
import { ResponsiveDialog } from './responsive-dialog';

it('gives row links a direction-aware trailing chevron and interaction feedback', () => {
  const html = renderToStaticMarkup(createElement(RowLink, { href: '/captain/templates' }, 'Templates'));
  for (const value of ['dir-icon', 'cursor-pointer', 'press', 'hover:bg-surface-raised', 'focus-visible:ring-2']) expect(html).toContain(value);
  expect(html.indexOf('Templates')).toBeLessThan(html.indexOf('<svg'));
});

it.each([false, true])('exposes native disclosure state: %s', open => {
  const html = renderToStaticMarkup(createElement(Disclosure, { label: 'Details', open }, 'Body'));
  expect(html).toContain('<details');
  expect(html).toContain(`aria-expanded="${open}"`);
  for (const value of ['<summary', 'group-open:rotate-180', 'focus-visible:ring-2', 'cursor-pointer', 'press']) expect(html).toContain(value);
});

it('labels the editable field and shows a decorative pencil with keyboard focus', () => {
  const html = renderToStaticMarkup(createElement(EditInPlace, { label: 'Name', defaultValue: 'Program' }));
  for (const value of ['Name', 'value="Program"', 'recessed', 'lucide-pencil', 'aria-hidden="true"', 'focus-visible:ring-2']) expect(html).toContain(value);
});

it('renders the optional dialog header, translated close control and footer', () => {
  const html = renderToStaticMarkup(createElement(ResponsiveDialog, { title: 'Details', fallbackId: 'opener', onDismiss: () => {}, onClose: () => {}, footer: 'Save' }, 'Body'));
  for (const value of ['<header', 'Details', 'aria-label="اقفل النافذة"', 'captain-dialog-body', '<footer', 'Save']) expect(html).toContain(value);
});

it('scopes popup and chip styling to dark captain surfaces and limits blur to the backdrop', () => {
  const css = readFileSync(new URL('../app/surfaces.css', import.meta.url), 'utf8');
  const rules = css.slice(css.indexOf("html:not([data-theme='light']) [data-area='captain'] {\n  :is(dialog"));
  for (const value of ['border-radius: 24px', 'var(--featured-edge)', 'scrollbar-width: thin', '.captain-chip', 'inset: 5px 0', 'inset-block-end: 0']) expect(rules).toContain(value);
  expect(rules).toContain('backdrop-filter: blur(4px)');
  expect(rules.split('dialog::backdrop')[0]).toContain('backdrop-filter: none');
  expect(rules).not.toMatch(/(?:^|[;\s])filter: blur/);
});
