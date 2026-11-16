import type { ReactElement } from 'react';
import type * as React from 'react';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { CheckinSheet } from './components/checkin-sheet';

const state = vi.hoisted(() => ({ values: [] as unknown[], errors: [] as unknown[], index: 0 }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useEffect: () => {}, useRef: () => ({ current: null }),
  useState: (initial: unknown) => {
    const index = state.index++;
    return [initial, (value: unknown) => { state.values[index] = value; state.errors.push(value); }];
  },
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: () => createT(messages, 'en') }));
vi.mock('@/core/timezone/client', () => ({ useTimezone: () => 'Africa/Cairo' }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({}) }));
vi.mock('./data/checkins', () => ({ submitCheckIn: async () => ({ error: "You've already sent this week's check-in" }) }));

it('keeps the sheet open with a translated error when this week already has a check-in', async () => {
  state.index = 0; state.errors = [];
  const sent = vi.fn();
  const tree = CheckinSheet({ open: true, onClose() {}, onSent: sent });
  const form = tree.props.children as ReactElement<{ onSubmit: (event: { preventDefault(): void }) => Promise<void> }>;
  await form.props.onSubmit({ preventDefault() {} });
  expect(sent).not.toHaveBeenCalled();
  expect(state.errors).toContain("You've already sent this week's check-in");
});
