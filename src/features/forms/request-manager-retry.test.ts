import { isValidElement } from 'react';
import type * as React from 'react';
import type { ReactElement } from 'react';
import { expect, it, vi } from 'vitest';
import { RequestManager } from './components/request-manager';

const state = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], remind: vi.fn(), reload: vi.fn(), mutation: undefined as Promise<boolean> | undefined }));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useCallback: (fn: unknown) => fn,
  useRef: () => ({ current: false }),
  useState: <T,>(initial: T) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [state.values[index] as T, (next: T) => { state.values[index] = next; }];
  },
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ refresh() {} }) }));
vi.mock('@/core/i18n/client', () => ({ useT: () => (key: string) => key }));
vi.mock('@/core/timezone/client', () => ({ useViewerTimezone: () => 'Africa/Cairo' }));
vi.mock('./data/request-actions', () => ({
  remindRequest: state.remind, playerRequests: vi.fn(), requestPicker: vi.fn(), requestDetail: vi.fn(),
}));
vi.mock('@/core/resource', () => ({ useResource: () => ({
  status: 'ready', retry: state.reload, data: { pending: [{ id: 'first' }, { id: 'second' }], forms: [], requests: [] },
  mutate: (_update: unknown, commit: () => Promise<unknown>) => {
    state.mutation = commit().then(() => true, () => false);
    return state.mutation;
  },
}) }));

function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function controls(label: string) {
  state.cursor = 0;
  return nodes(RequestManager({ playerId: 'player', locale: 'en' }))
    .filter(node => node.props.children === label).map(node => node.props.onClick as () => void);
}

it('retries the failed reminder for the same request', async () => {
  state.remind.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
  controls('remind')[1]?.();
  await state.mutation;
  expect(controls('retry')).toHaveLength(1);
  controls('retry')[0]?.();
  await state.mutation;
  expect(state.remind.mock.calls).toEqual([['second'], ['second']]);
  expect(state.reload).not.toHaveBeenCalled();
});
