import { createElement, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as React from 'react';
import type * as FeedbackData from './data/session-feedback';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';

const state = vi.hoisted(() => ({ index: 0, values: [] as unknown[], setters: [] as ReturnType<typeof vi.fn>[], save: vi.fn(), db: {} }));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useState: (initial: unknown) => {
    const index = state.index++;
    const setter = vi.fn(); state.setters[index] = setter;
    return [index in state.values ? state.values[index] : initial, setter];
  },
  useRef: (current: unknown) => ({ current }),
}));
vi.mock('@/core/i18n/client', () => ({ useT: (messages: Parameters<typeof createT>[0]) => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('@/core/offline', () => ({ localDb: () => state.db }));
vi.mock('./data/session-feedback', async original => ({
  ...await original<typeof FeedbackData>(), saveSessionFeedback: state.save,
}));
import { SessionFeedback } from './components/session-feedback';

const now = Date.parse('2026-11-05T10:00:00Z');
beforeEach(() => {
  state.index = 0; state.values = []; state.setters = []; state.save.mockReset().mockResolvedValue(undefined);
  vi.spyOn(Date, 'now').mockReturnValue(now);
});
afterEach(() => { vi.restoreAllMocks(); });

function click(node: ReactNode, label: string): boolean {
  if (!isValidElement<{ children?: ReactNode; onClick?: () => void }>(node)) return false;
  if (node.props.children === label && node.props.onClick) { node.props.onClick(); return true; }
  return (Array.isArray(node.props.children) ? node.props.children : [node.props.children]).some(child => click(child, label));
}

it('offers exactly ten accessible 48px RPE buttons and the two anchors', () => {
  const html = renderToStaticMarkup(createElement(SessionFeedback, { sessionId: 's', hasFeedback: false }));
  expect(html.match(/aria-pressed="false"/g)).toHaveLength(10);
  expect(html).toContain('Very easy'); expect(html).toContain('Max effort');
  expect(html).toContain('min-h-12'); expect(html).toContain('maxLength="500"');
});

it('skip goes straight to DonePanel without saving', () => {
  const panel = SessionFeedback({ sessionId: 's', hasFeedback: false });
  expect(click(panel, 'Skip')).toBe(true);
  expect(state.save).not.toHaveBeenCalled();
  expect(state.setters[0]).toHaveBeenCalledWith(true);
});

it('send saves selected feedback before showing DonePanel', async () => {
  state.values = [false, 9, 'pain'];
  const panel = SessionFeedback({ sessionId: 's', hasFeedback: false });
  expect(click(panel, 'Send')).toBe(true);
  expect(state.save).toHaveBeenCalledWith(state.db, 's', { rpe: 9, note: 'pain' }, now);
  expect(state.setters[0]).not.toHaveBeenCalled();
  await Promise.resolve();
  expect(state.setters[0]).toHaveBeenCalledWith(true);
});

it('keeps the sheet open when the local write fails', async () => {
  state.values = [false, 1, '']; state.save.mockRejectedValueOnce(new Error('disk full'));
  click(SessionFeedback({ sessionId: 's', hasFeedback: false }), 'Send');
  await Promise.resolve();
  expect(state.setters[0]).not.toHaveBeenCalled();
  expect(state.setters[4]).toHaveBeenCalledWith(true);
});
