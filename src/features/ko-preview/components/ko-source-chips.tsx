import { useT } from '@/core/i18n/client';
import type { AnswerSource } from '@/features/ko-core';
import { messages } from '../messages';

const label = {
  workout_today: 'sourceWorkout', workout_tomorrow: 'sourceWorkout', captain: 'sourceWorkout',
  nutrition_today: 'sourceNutrition', progress: 'sourceProgress',
  me: 'sourceMe', team_summary: 'sourceTeam', player_summary: 'sourceTeam',
} as const satisfies Record<AnswerSource, string>;

export function KoSourceChips({ sources }: { sources: AnswerSource[] }) {
  const t = useT(messages);
  return <div className="flex flex-wrap gap-inline">
    {[...new Set(sources.map(source => label[source]))].map(key => key &&
      <span key={key} className="text-xs text-muted rounded-chip border border-line px-inline">{t(key)}</span>)}
  </div>;
}
