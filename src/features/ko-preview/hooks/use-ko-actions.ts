import { useEffect, useRef, useState } from 'react';
import type { AccountAction, AccountReply } from '@/features/ko-core';
import { createApproval } from '../approval';

export type ActionState =
  | { kind: 'submitting' | 'cancelled' }
  | { kind: 'done' | 'failed'; text: string };

export type ChatAction = Omit<AccountAction, 'token'> & {
  approval: ReturnType<typeof createApproval>;
};

export function chatActions(reply: AccountReply, now = Date.now()): ChatAction[] {
  const actions = reply.kind === 'message' ? reply.actions ?? []
    : [{ id: reply.token, token: reply.token, title: reply.text, detail: '' }];
  return actions.map(({ token, ...action }) => ({ ...action, approval: createApproval(token, now) }));
}

export function latestPendingAction(cards: ChatAction[], states: Record<string, ActionState>, now = Date.now()) {
  return cards.findLast(action => !states[action.id] && !action.approval.expired(now));
}

export function useKoActions(locale: string, failureText: string) {
  const [states, setStates] = useState<Record<string, ActionState>>({});
  const inFlight = useRef(new Set<AbortController>());
  useEffect(() => {
    const requests = inFlight.current;
    return () => requests.forEach(request => request.abort());
  }, []);

  const update = (id: string, state: ActionState) => setStates(current => ({ ...current, [id]: state }));
  async function confirm(action: ChatAction) {
    const token = action.approval.take(Date.now());
    if (!token) return;
    update(action.id, { kind: 'submitting' });
    const controller = new AbortController();
    inFlight.current.add(controller);
    const body = new FormData();
    body.set('confirm', '1');
    body.set('token', token);
    body.set('locale', locale);
    try {
      const response = await fetch('/api/ko', { method: 'POST', body, signal: controller.signal });
      const result = await response.json() as AccountReply;
      if (controller.signal.aborted) return;
      update(action.id, {
        kind: response.ok && result.kind === 'message' ? 'done' : 'failed',
        text: result.kind === 'message' ? result.text : failureText,
      });
    } catch {
      if (!controller.signal.aborted) update(action.id, { kind: 'failed', text: failureText });
    } finally {
      inFlight.current.delete(controller);
    }
  }

  function cancel(action: ChatAction) {
    if (!action.approval.take(Date.now())) return;
    update(action.id, { kind: 'cancelled' });
  }

  return { states, confirm, cancel };
}
