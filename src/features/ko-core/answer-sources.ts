export const answerSources = ['workout_today', 'workout_tomorrow', 'nutrition_today', 'progress',
  'captain', 'team_summary', 'player_summary'] as const;
export type AnswerSource = typeof answerSources[number];
