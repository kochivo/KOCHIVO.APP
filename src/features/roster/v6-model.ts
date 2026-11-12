import { daysBetween } from '@/lib/dates';
import type { RosterPlayer } from './types';

export type RosterFilter = 'active' | 'needsProgram' | 'late' | 'ending';
export function matchesFilter(player: RosterPlayer, filter: RosterFilter, today: string) {
  if (filter === 'needsProgram') return !player.programTitle;
  if (filter === 'late') return daysBetween(player.lastTrainingDate ?? player.startedOn, player.playerToday ?? today) >= 4;
  if (filter === 'ending') { const days = daysBetween(today, player.accessUntil); return days >= 0 && days <= 7; }
  return true;
}
export function rosterCounts(players: RosterPlayer[], today: string) {
  return { active: players.length, needsProgram: players.filter(p => matchesFilter(p, 'needsProgram', today)).length,
    late: players.filter(p => matchesFilter(p, 'late', today)).length, ending: players.filter(p => matchesFilter(p, 'ending', today)).length };
}
export function filterRoster(players: RosterPlayer[], filter: RosterFilter, search: string, today: string) {
  const query = search.trim().toLocaleLowerCase();
  return players.filter(player => matchesFilter(player, filter, today) && player.fullName.toLocaleLowerCase().includes(query));
}
