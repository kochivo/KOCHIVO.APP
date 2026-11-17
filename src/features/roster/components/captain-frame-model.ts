import { KoHome } from '@/ui/icons/ko-home';
import { KoPlayers } from '@/ui/icons/ko-players';
import { KoFollowup } from '@/ui/icons/ko-followup';
import { KoCaptainChat } from '@/ui/icons/ko-captain-chat';
import { KoInvite } from '@/ui/icons/ko-invite';
import { KoProgress } from '@/ui/icons/ko-progress';
import { KoBilling } from '@/ui/icons/ko-billing';
import { KoTraining } from '@/ui/icons/ko-training';
import { KoMealPlans } from '@/ui/icons/ko-meal-plans';
import { KoFoods } from '@/ui/icons/ko-foods';
import { KoForms } from '@/ui/icons/ko-forms';
import { KoSettings } from '@/ui/icons/ko-settings';
import { KoPackages } from '@/ui/icons/ko-packages';
import { KoTemplate } from '@/ui/icons/ko-template';

export const frameItems = [
  { id: 'home', href: '/captain', group: 'work', icon: KoHome, available: true, mobile: true },
  { id: 'tasks', href: '/captain/tasks', group: 'work', icon: KoFollowup, available: true, mobile: true },
  { id: 'inbox', href: '/captain/inbox', group: 'work', icon: KoCaptainChat, available: true, mobile: true },
  { id: 'players', href: '/captain/players', group: 'team', icon: KoPlayers, available: true, mobile: true },
  { id: 'join', href: '/captain/join', group: 'team', icon: KoInvite, available: true, mobile: false },
  { id: 'ranks', href: '/captain/leaderboard', group: 'team', icon: KoProgress, available: true, mobile: false },
    { id: 'programs', href: '/captain/templates', group: 'library', icon: KoTemplate, available: true, mobile: false },
  { id: 'exercises', href: '/captain/library/exercises', group: 'library', icon: KoTraining, available: true, mobile: false },
  { id: 'plans', href: '/captain/library/meal-plans', group: 'library', icon: KoMealPlans, available: true, mobile: false },
  { id: 'foods', href: '/captain/library/foods', group: 'library', icon: KoFoods, available: true, mobile: false },
  { id: 'forms', href: '/captain/library/forms', group: 'library', icon: KoForms, available: true, mobile: false },
  { id: 'billing', href: '/captain/billing', group: 'money', icon: KoBilling, available: true, mobile: false },
  { id: 'packages', href: '/captain/billing/packages', group: 'money', icon: KoPackages, available: true, mobile: false },
  { id: 'settings', href: '/captain/settings', group: 'account', icon: KoSettings, available: true, mobile: false },
] as const;
export type FrameId = typeof frameItems[number]['id'];
export const frameGroups = ['work', 'team', 'library', 'money', 'account'] as const;
/** The desktop sidebar reaches settings through the profile card, so it skips this group. */
export const sidebarHiddenGroups: readonly string[] = ['account'];
export type FrameCounts = { tasks: number | null; inbox: number | null; join: number | null; billing: number | null };

export function frameCounts(input: { tasks: number | null; chats: Record<string, number> | null; joins: number | null }): FrameCounts {
  return { tasks: input.tasks, inbox: input.chats === null ? null : Object.values(input.chats).reduce((a, b) => a + b, 0),
    join: input.joins, billing: null };
}

export function frameParent(path: string): FrameId {
  if (/^\/captain\/players(?:\/|$)/u.test(path)) return 'players';
  if (path.startsWith('/captain/programs/')) return 'programs';
  if (path.startsWith('/captain/nutrition/')) return 'plans';
  return [...frameItems].reverse().find(item => item.href !== '/captain' &&
    (path === item.href || path.startsWith(`${item.href}/`)))?.id ?? 'home';
}
