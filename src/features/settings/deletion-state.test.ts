import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { DeleteAccountCard } from './components/delete-account-card';
import { deletionRequestedAt } from './deletion';

const state = vi.hoisted(() => ({ index: 0, values: [] as unknown[], request: vi.fn(), cancel: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(), useState: (initial: unknown) => {
  const index = state.index++;
  if (!(index in state.values)) state.values[index] = typeof initial === 'function' ? initial() : initial;
  return [state.values[index], (next: unknown) => { state.values[index] = next; }];
} }));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('@/core/timezone/client', () => ({ useTimezone: () => 'Africa/Cairo' }));
vi.mock('./data/settings', () => ({ requestDeletion: state.request, cancelDeletion: state.cancel }));
function nodes(node: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(node) ? [node, ...nodes(node.props.children)] : [];
}
beforeEach(() => { state.index = 0; state.values = []; vi.clearAllMocks(); });
it('updates parent deletion state from the server date so reopening retains cancellation', async () => {
  state.values = [null, 'DELETE'];
  state.request.mockResolvedValue({ data: '2026-11-19T10:00:00.000Z' });
  const onChange = vi.fn();
  const tree = DeleteAccountCard({ requestedAt: null, onChange });
  const button = nodes(tree).find(node => typeof node.props.onClick === 'function');
  (button?.props.onClick as () => void)();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(onChange).toHaveBeenCalledWith('2026-11-19T10:00:00.000Z');
  expect(deletionRequestedAt(onChange.mock.calls[0]?.[0] as string)).toBe('2026-11-12T10:00:00.000Z');
  state.index = 0; state.values = [];
  const reopened = DeleteAccountCard({ requestedAt: deletionRequestedAt(onChange.mock.calls[0]?.[0] as string) });
  expect(nodes(reopened).some(node => node.type === 'time' && node.props.dateTime === '2026-11-19T10:00:00.000Z')).toBe(true);
});
it('clears parent deletion state when cancellation succeeds', async () => {
  state.cancel.mockResolvedValue({ data: null });
  const onChange = vi.fn();
  const tree = DeleteAccountCard({ requestedAt: '2026-11-12T10:00:00Z', onChange });
  (nodes(tree).find(node => typeof node.props.onClick === 'function')?.props.onClick as () => void)();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(onChange).toHaveBeenCalledWith(null);
});
