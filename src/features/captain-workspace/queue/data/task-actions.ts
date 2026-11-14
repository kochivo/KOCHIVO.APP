'use client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { CaptainTask } from '../tasks-model';
import type { VoiceInput } from '@/features/chat';
export async function replyToTask(task: CaptainTask, captainId: string, body: string,
  voice?: Pick<VoiceInput, 'blob' | 'mimeType' | 'durationSeconds' | 'id'>) {
  if (voice) {
    const { sendVoice } = await import('@/features/chat');
    await sendVoice(await loadSupabaseBrowser(), { ...voice, captainId, senderId: captainId, playerId: task.playerId });
  }
  if (task.item) {
    const { reviewItem } = await import('@/features/inbox');
    const result = await reviewItem({ id: task.item.id, kind: task.item.kind, reply: body });
    if (result.error) throw new Error(result.error);
  } else if (body.trim()) {
    const { sendText } = await import('@/features/chat');
    await sendText(await loadSupabaseBrowser(), { captainId, senderId: captainId, playerId: task.playerId, body });
  }
}
export async function approveTaskSwap(task: CaptainTask) {
  if (!task.swap) throw new Error('Missing swap');
  const { decideSwapOptimistically } = await import('@/features/ko-feed');
  if (!await decideSwapOptimistically(task.swap.id, true, () => {})) throw new Error('Swap failed');
}
