import { daysBetween, saturdayWeek, weeklyWeekday } from '@/lib/dates';
import type { RosterPlayer } from '../types';

export const tabs = ['all', 'needsYou', 'good', 'newPlayers', 'ending', 'stopped'] as const;
export type Tab = typeof tabs[number];
export type Dot = 'done' | 'missed' | 'empty';
export interface PlayerActivity {
  dates: string[]; weekdays: number[]; rpe: number | null; video: boolean;
  rank?: 'beginner' | 'champion' | 'elite' | 'legend';
  assessments?: number;
}
export type Activity = Record<string, PlayerActivity>;

export function playerStatus(player: RosterPlayer, today: string, video = false) {
  const days = daysBetween(today, player.accessUntil);
  const absent = daysBetween(player.lastTrainingDate ?? player.startedOn, player.playerToday ?? today);
  if (player.frozenAt) return { key: 'paused', tone: 'muted', count: 0 } as const;
  if (player.awaitingPlansAt) return { key: 'waitingForPlans', tone: 'calm', count: 0 } as const;
  if (days < 0) return { key: 'expired', tone: 'muted', count: 0 } as const;
  if (video) return { key: 'video', tone: 'warn', count: 0 } as const;
  if (absent >= 4) return { key: 'absent', tone: 'warn', count: absent } as const;
  if (days <= 7) return { key: 'renewal', tone: 'calm', count: days } as const;
  if (!player.programTitle) return { key: 'needsProgram', tone: 'calm', count: 0 } as const;
  if (player.openTasks > 0) return { key: 'needsYou', tone: 'calm', count: 0 } as const;
  return { key: 'good', tone: 'lime', count: 0 } as const;
}

export function matchesTab(player: RosterPlayer, tab: Tab, today: string) {
  const days = daysBetween(today, player.accessUntil);
  const stopped = Boolean(player.frozenAt) || (!player.awaitingPlansAt && days < 0);
  if (tab === 'needsYou') return player.openTasks > 0;
  if (tab === 'good') return playerStatus(player, today).key === 'good';
  if (tab === 'newPlayers') { const age = daysBetween(player.startedOn, today); return age >= 0 && age < 7; }
  if (tab === 'ending') return !player.awaitingPlansAt && !stopped && days <= 7;
  if (tab === 'stopped') return stopped;
  return true;
}
export function tabCounts(players: RosterPlayer[], today: string) {
  return Object.fromEntries(tabs.map(tab => [tab, players.filter(player => matchesTab(player, tab, today)).length])) as Record<Tab, number>;
}
export function weekDots(today: string, completed: string[], weekdays: number[], startedOn: string): Dot[] {
  return saturdayWeek(today).map(date => completed.includes(date) && date <= today ? 'done' :
    date < today && date >= startedOn && weekdays.includes(weeklyWeekday(date)) ? 'missed' : 'empty');
}
export function activityRange(players: RosterPlayer[], today: string) {
  const dates = [today, ...players.map(player => player.playerToday ?? today)].sort();
  return { start: saturdayWeek(dates[0] ?? today)[0] ?? today, end: dates.at(-1) ?? today };
}
export function withOpenTasks(players: RosterPlayer[], activity: Activity): RosterPlayer[] {
  return players.map(player => ({ ...player, openTasks: player.openTasks + (activity[player.playerId]?.assessments ?? 0) }));
}
