import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { AvatarPicker } from './components/avatar-picker';

const mock = vi.hoisted(() => ({ click: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => [initial, vi.fn()],
  useRef: () => ({ current: { click: mock.click } }), useEffect: () => {},
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en') }));
vi.mock('./data/captain-avatar', () => ({ captainAvatarUrl: async () => '' }));
type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
it('opens the file chooser through an accessible control and reports the selected file', () => {
  const onChange = vi.fn();
  const tree = AvatarPicker({ name: 'Ali', file: null, pending: false, onChange });
  const html = renderToStaticMarkup(tree);
  expect(html).toContain('aria-label="Change profile photo"');
  expect(html).toContain('>A</span>');
  const all = nodes(tree);
  (all.find(node => node.type === 'button')?.props.onClick as () => void)();
  expect(mock.click).toHaveBeenCalled();
  const file = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' });
  (all.find(node => node.type === 'input')?.props.onChange as (event: unknown) => void)({ target: { files: [file] } });
  expect(onChange).toHaveBeenCalledWith(file);
});
it('disables selection while a save is pending', () => {
  const tree = AvatarPicker({ name: 'Ali', file: null, pending: true, onChange: vi.fn() });
  expect(nodes(tree).find(node => node.type === 'button')?.props.disabled).toBe(true);
});
