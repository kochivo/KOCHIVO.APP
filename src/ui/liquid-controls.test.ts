import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import { expect, it, vi } from 'vitest';
import { Button, buttonClass } from './button';
import { IconButton } from './icon-button';
import { createToastQueue, ToastProvider } from './toast';
import ToastIcon from './toast-icon';

it('shares variants, sizes and width between buttons and links', () => {
  for (const variant of ['primary', 'secondary', 'ghost', 'danger'] as const) {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const classes = buttonClass({ variant, size, block: true });
      expect(classes).toContain(`control-${variant}`);
      expect(classes).toContain(`control-${size}`);
      expect(classes).toContain('rounded-control');
      expect(classes).toContain('w-full');
      expect(renderToStaticMarkup(createElement(Button, { variant, size, block: true }))).toContain(classes);
    }
  }
  expect(buttonClass({ block: false })).not.toContain('w-full');
});

it('preserves caller padding and type size without competing defaults', () => {
  const html = renderToStaticMarkup(createElement(Button, { className: 'px-2 text-xs min-h-16' }));
  expect(html).toContain('px-2 text-xs min-h-16');
  expect(html).not.toContain('px-4');
  expect(html).not.toContain('text-sm');
  const icon = renderToStaticMarkup(createElement(IconButton, { 'aria-label': 'Open' }));
  expect(icon).toContain('p-0'); expect(icon).not.toContain('px-4');
});

it('queues rich successes alongside strings and pauses their remaining lifetime', () => {
  vi.useFakeTimers();
  try {
    const queue = createToastQueue({ now: () => 1234 + Date.now(), setTimer: setTimeout, clearTimer: clearTimeout });
    queue.success({ title: 'Saved', detail: 'Day 1', icon: 'program' });
    queue.success('Legacy');
    expect(queue.getSnapshot()[0]).toMatchObject({ text: 'Saved', detail: 'Day 1', icon: 'program' });
    const id = queue.getSnapshot()[0]?.id ?? '';
    vi.advanceTimersByTime(1000); queue.pause(id, 'hover'); queue.pause(id, 'focus');
    vi.advanceTimersByTime(4000); queue.resume(id, 'hover');
    expect(queue.getSnapshot().find(item => item.id === id)?.leaving).toBe(false);
    queue.resume(id, 'focus'); vi.advanceTimersByTime(3000);
    expect(queue.getSnapshot().find(item => item.id === id)?.leaving).toBe(true);
    vi.advanceTimersByTime(200); expect(queue.getSnapshot()).toEqual([]);
    queue.dispose();
  } finally { vi.useRealTimers(); }
});

it.each([
  ['program', 'dumbbell'], ['meal', 'utensils'], ['player', 'user-round-plus'],
  ['payment', 'banknote'], ['message', 'message-circle'], ['form', 'clipboard-check'],
  ['template', 'copy'], ['check', 'check'],
] as const)('renders the %s icon, title and truncated detail', (icon, name) => {
  vi.useFakeTimers();
  try {
    const queue = createToastQueue(); queue.success({ title: 'Saved', detail: 'Details', icon });
    const html = renderToStaticMarkup(createElement(ToastProvider, { queue }));
    expect(renderToStaticMarkup(createElement(ToastIcon, { name: icon }))).toContain(`lucide-${name}`);
    for (const value of ['size-9', 'bg-lime-soft', 'font-semibold', 'truncate', 'Details', 'toast-enter']) expect(html).toContain(value);
    queue.dispose();
  } finally { vi.useRealTimers(); }
});

it('uses named icons and dedicated reduced-motion toast transitions', () => {
  const css = readFileSync(new URL('../app/controls.css', import.meta.url), 'utf8');
  expect(css).toContain('300ms'); expect(css).toContain('translateY(8px)');
  expect(css).toContain('200ms'); expect(css).toContain('prefers-reduced-motion');
  expect(css).toContain('min-width: 1024px'); expect(css).toContain('inset-inline-end');
  expect(css).toContain('backdrop-filter: none');
});

it('does not hand-roll primary or secondary buttons in features or routes', () => {
  const violations: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { walk(path); continue; }
      if (!path.endsWith('.tsx') || path.includes('.test.')) continue;
      const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const declarations = new Map<string, ts.Expression>();
      const collect = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) declarations.set(node.name.text, node.initializer);
        ts.forEachChild(node, collect);
      };
      collect(source);
      const expand = (node: ts.Node, seen = new Set<string>()): string => {
        if (ts.isIdentifier(node) && !seen.has(node.text)) {
          const value = declarations.get(node.text);
          if (value) return expand(value, new Set([...seen, node.text]));
        }
        let result = node.getText(source);
        ts.forEachChild(node, child => { result += ' ' + expand(child, seen); });
        return result;
      };
      const visit = (node: ts.Node) => {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ['button', 'a', 'Link'].includes(node.tagName.getText(source))) {
          const chip = node.attributes.properties.some(attr => ts.isJsxAttribute(attr) && (['aria-pressed', 'aria-current'].includes(attr.name.getText(source)) || attr.name.getText(source) === 'role' && /tab|radio|switch/.test(attr.initializer?.getText(source) ?? '')));
          if (chip) return;
          const attribute = node.attributes.properties.find(attr => ts.isJsxAttribute(attr) && attr.name.getText(source) === 'className');
          const classes = attribute ? expand(attribute) : '';
          if (/(?:[\s"'`])bg-lime(?=[\s"'`])/.test(classes) && /(?:[\s"'`])text-on-lime(?=[\s"'`])/.test(classes) || /(?:[\s"'`])glass(?=[\s"'`])/.test(classes) && /\bmin-h-12\b/.test(classes) && /\brounded-control\b/.test(classes)) violations.push(`${path}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  };
  walk('src/features'); walk('src/app');
  expect(violations).toEqual([]);
});
