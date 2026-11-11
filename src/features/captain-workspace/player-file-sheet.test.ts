import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import type * as ReactModule from 'react';
import { Children, isValidElement } from 'react';
import { expect, it, vi } from 'vitest';
import { PlayerFileSheet } from './components/player-file-sheet';
import { ResponsiveDialog } from '@/ui/responsive-dialog';

const state = vi.hoisted(() => ({ open: false }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useId: () => 'file', useState: () => [state.open, (open: boolean) => { state.open = open; }],
}));
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap(child => isValidElement(child)
    ? [child as ReactElement<Record<string, unknown>>, ...elements((child.props as { children?: ReactNode }).children)] : []);
}
it('opens from the compact strip and closes from the labelled button and dialog dismissal', () => {
  const props = { locale: 'en' as const, summary: '27 years', children: 'Full file' };
  state.open = false;
  const opener = elements(PlayerFileSheet(props)).find(element => element.type === 'button');
  expect(opener?.props['aria-describedby']).toBe('file-summary');
  expect(elements(PlayerFileSheet(props)).find(element => element.props.id === 'file-summary')?.props.children).toBe('27 years');
  (opener?.props as ButtonHTMLAttributes<HTMLButtonElement>).onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  expect(state.open).toBe(true);
  const opened = elements(PlayerFileSheet(props));
  const dialog = opened.find(element => element.type === ResponsiveDialog);
  expect(dialog?.props.modal).toBe(true);
  expect(dialog?.props['aria-labelledby']).toBe('file-title');
  const close = opened.find(element => element.props['aria-label'] === 'Close player file');
  (close?.props as ButtonHTMLAttributes<HTMLButtonElement>).onClick?.({} as React.MouseEvent<HTMLButtonElement>);
  expect(state.open).toBe(false);
  state.open = true;
  (dialog?.props.onDismiss as () => void)();
  expect(state.open).toBe(false);
  expect(elements(PlayerFileSheet(props)).some(element => element.type === ResponsiveDialog)).toBe(false);
});
