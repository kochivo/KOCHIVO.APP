import type { AccountReply, AnswerSource } from '@/features/ko-core';

export type Memory = NonNullable<Extract<AccountReply, { kind: 'message' }>['memory']>;
export type MemoryState = { learning: boolean; memories: Memory[] };
export type FeedbackReason = 'misunderstood' | 'wrong' | 'long';
export type Feedback = { id: string; question: string; answer: string; intent: string; sources?: AnswerSource[];
  helpful: boolean; reason?: FeedbackReason };

export async function koLearning(body: object, signal?: AbortSignal) {
  const response = await fetch('/api/ko/learning', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal, keepalive: !signal,
  });
  if (!response.ok) throw new Error('KO learning request failed');
  return response;
}

export async function readKoMemory(signal: AbortSignal): Promise<MemoryState> {
  return (await koLearning({ operation: 'list' }, signal)).json();
}
