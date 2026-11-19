import type { AccountReply } from '@/features/ko-core';
import { latinDigits } from './answer-guard';

type Reply = AccountReply | { error: string } | { name: string | null } | { used: number; cap: number; month: string };

export function chatReply(data: Reply, status = 200) {
  let body = data;
  if ('text' in data) {
    const text = latinDigits(data.text);
    body = data.kind === 'confirm' ? { ...data, text } : {
      ...data,
      text,
      ...(data.memory && { memory: { ...data.memory, text: latinDigits(data.memory.text) } }),
      ...(data.quick && { quick: data.quick.map(latinDigits) }),
      ...(data.actions && { actions: data.actions.map(action => ({
        ...action, title: latinDigits(action.title), detail: latinDigits(action.detail),
      })) }),
    };
  }
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
