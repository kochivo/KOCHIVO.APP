import type { ReactElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { EmptyStateProps } from '@/ui/empty-state';
import { RemindButton } from './components/remind-button';

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

function clickReminder() {
  const element = RemindButton({ playerId: 'p', kind: 'checkins', title: '', body: '', label: 'Remind' }) as ReactElement<EmptyStateProps>;
  element.props.action?.onClick?.();
}

it.each([false, true])('scrolls to and focuses the recorder, reduced motion=%s', reduced => {
  const focus = vi.fn();
  const scrollIntoView = vi.fn();
  const querySelector = vi.fn(() => ({ focus }));
  const getElementById = vi.fn(() => ({ scrollIntoView, querySelector }));
  vi.stubGlobal('document', { getElementById });
  vi.stubGlobal('window', { matchMedia: () => ({ matches: reduced }) });
  clickReminder();
  expect(getElementById).toHaveBeenCalledWith('voice-recorder-p');
  expect(scrollIntoView).toHaveBeenCalledWith({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
  expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  expect(navigation.push).not.toHaveBeenCalled();
});

it('navigates to check-ins with the recorder hash when it is absent', () => {
  vi.stubGlobal('document', { getElementById: () => null });
  clickReminder();
  expect(navigation.push).toHaveBeenCalledWith('/captain/players/p?tab=checkins#voice-recorder-p', { scroll: false });
});
