import { daysBetween, localDate } from '@/lib/dates';
import type { VoiceNote } from './types';

export type CaptainReply = { id: string; captain_reply: string | null; reviewed_at: string | null };
export type ThreadItem = { id: string; createdAt: string } & (
  { kind: 'voice'; note: VoiceNote } | { kind: 'reply'; text: string }
);

export function captainThread(notes: readonly VoiceNote[], replies: readonly CaptainReply[]): ThreadItem[] {
  const audio: ThreadItem[] = notes.map(note => ({ id: `voice:${note.id}`, createdAt: note.createdAt, kind: 'voice', note }));
  const text: ThreadItem[] = replies.flatMap(reply => reply.captain_reply?.trim() && reply.reviewed_at
    ? [{ id: `reply:${reply.id}`, createdAt: reply.reviewed_at, kind: 'reply' as const, text: reply.captain_reply }] : []);
  return [...audio, ...text].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
}

export function threadDay(timestamp: string, now: Date, timezone: string) {
  const date = localDate(new Date(timestamp), timezone);
  const age = daysBetween(date, localDate(now, timezone));
  return age === 0 ? 'today' : age === 1 ? 'yesterday' : date;
}
