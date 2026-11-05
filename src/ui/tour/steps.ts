import type { Translator } from '@/core/i18n/messages';
import type { messages } from './messages';

export interface TourStep { target: string; title: string; body: string }
export function tourSteps(role: 'captain' | 'player', t: Translator<typeof messages>): TourStep[] {
  const definitions = role === 'captain' ? [
    ['captain-home', 'captainHomeTitle', 'captainHomeBody'],
    ['invite-player', 'inviteTitle', 'inviteBody'],
    ['/captain/inbox', 'inboxTitle', 'inboxBody'],
    ['/captain/templates', 'templatesTitle', 'templatesBody'],
    ['/captain/billing', 'billingTitle', 'billingBody'],
  ] as const : [
    ['player-workout', 'workoutTitle', 'workoutBody'],
    ['workout-start', 'setTitle', 'setBody'],
    ['/player/nutrition', 'nutritionTitle', 'nutritionBody'],
    ['/player/captain', 'coachTitle', 'coachBody'],
  ] as const;
  return definitions.map(([target, title, body]) => ({ target, title: t(title), body: t(body) }));
}
