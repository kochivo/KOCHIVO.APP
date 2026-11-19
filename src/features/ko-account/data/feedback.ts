import 'server-only';
import { z } from 'zod';
import { answerSources } from '@/features/ko-core';
import type { KoActor } from './account';
import { scrubFeedback } from './feedback-scrub';

export const feedbackIntents = [
  'answer', 'quick', 'my_workout', 'my_progress', 'why_not_counted', 'player_summary',
  'team_summary', 'read_exercise', 'read_nutrition',
] as const;

export const feedbackSchema = z.strictObject({
  id: z.uuidv7(),
  helpful: z.boolean(),
  reason: z.enum(['misunderstood', 'wrong', 'long']).optional(),
  intent: z.enum(feedbackIntents),
  sources: z.array(z.enum(answerSources)).max(4).default([]),
  question: z.string().max(800),
  answer: z.string().max(4000),
});

export async function submitFeedback(actor: KoActor, input: z.output<typeof feedbackSchema>) {
  const [profile, roster] = await Promise.all([
    actor.db.from('profiles').select('full_name').eq('id', actor.id).single(),
    actor.role === 'captain' ? actor.db.rpc('captain_roster') : actor.db.rpc('my_captain_profile'),
  ]);
  if (profile.error || roster.error) throw profile.error ?? roster.error;
  const names = roster.data.map(row => row.full_name);
  const { data, error } = await actor.db.rpc('ko_feedback_submit', {
    p_id: input.id,
    p_helpful: input.helpful,
    p_reason: input.helpful ? null : input.reason ?? null,
    p_intent: input.intent,
    p_sources: input.sources.filter(source => source !== 'me'),
    p_question: scrubFeedback(input.question, profile.data.full_name, names, 300),
    p_answer: scrubFeedback(input.answer, profile.data.full_name, names, 700),
  });
  if (error) throw error;
  return data;
}
