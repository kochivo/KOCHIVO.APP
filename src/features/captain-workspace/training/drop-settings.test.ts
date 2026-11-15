import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { DropSettings } from './drop-settings';
import { Stepper } from '@/ui/stepper';
import { Button } from '@/ui/button';
import { dropSchema } from '@/lib/set-plan';
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en') }));
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return [value, ...nodes(value.props.children)];
}
it('toggles drops and offers bounded count, percent and reps controls', () => {
  const onChange = vi.fn();
  let result = nodes(DropSettings({ onChange }));
  (result.find(node => node.type === Button)?.props.onClick as () => void)();
  expect(onChange).toHaveBeenLastCalledWith({ count: 2, percent: 20, mode: 'failure', reps: null });
  result = nodes(DropSettings({ onChange, drop: { count: 2, percent: 20, mode: 'reps', reps: 8 } }));
  const controls = result.filter(node => node.type === Stepper);
  expect(controls.map(node => [node.props.min, node.props.max, node.props.step])).toEqual([[1, 3, 1], [10, 40, 5], [1, 50, 1]]);
  (result.find(node => node.type === Button)?.props.onClick as () => void)();
  expect(onChange).toHaveBeenLastCalledWith(undefined);
  for (const count of [0, 4]) expect(dropSchema.safeParse({ count, percent: 20, mode: 'failure' }).success).toBe(false);
});
