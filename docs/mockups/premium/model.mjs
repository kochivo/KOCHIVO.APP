import { messages as m } from './messages.ts';
export const pages = [
  { id: 'site', route: '/', title: m.pageTitles["site"], group: 'public' },
  { id: 'coach-site', route: '/c/[slug]', title: m.pageTitles["coach-site"], group: 'public' },
  { id: 'demo', route: '/demo', title: m.pageTitles["demo"], group: 'public' },
  { id: 'ko', route: '/ko', title: m.pageTitles["ko"], group: 'public' },
  { id: 'login', route: '/login', title: m.pageTitles["login"], group: 'auth' },
  { id: 'invite', route: '/i/[code]', title: m.pageTitles["invite"], group: 'auth' },
  { id: 'forgot', route: '/forgot-password', title: m.pageTitles["forgot"], group: 'auth' },
  { id: 'reset', route: '/reset-password', title: m.pageTitles["reset"], group: 'auth' },
  { id: 'coach-home', route: '/captain', title: m.pageTitles["coach-home"], group: 'captain' },
  { id: 'roster', route: '/captain/players', title: m.pageTitles["roster"], group: 'captain' },
  { id: 'athlete', route: '/captain/players/[playerId]', title: m.pageTitles["athlete"], group: 'captain' },
  { id: 'athlete-programs', route: '/captain/players/[playerId]/programs', title: m.pageTitles["athlete-programs"], group: 'captain' },
  { id: 'athlete-nutrition', route: '/captain/players/[playerId]/nutrition', title: m.pageTitles["athlete-nutrition"], group: 'captain' },
  { id: 'athlete-preview', route: '/captain/players/[playerId]/preview', title: m.pageTitles["athlete-preview"], group: 'captain' },
  { id: 'inbox', route: '/captain/inbox', title: m.pageTitles["inbox"], group: 'captain' },
  { id: 'templates', route: '/captain/templates', title: m.pageTitles["templates"], group: 'captain' },
  { id: 'program', route: '/captain/programs/[programId]', title: m.pageTitles["program"], group: 'captain' },
  { id: 'meal-builder', route: '/captain/nutrition/[planId]', title: m.pageTitles["meal-builder"], group: 'captain' },
  { id: 'leaderboard', route: '/captain/leaderboard', title: m.pageTitles["leaderboard"], group: 'captain' },
  { id: 'billing', route: '/captain/billing', title: m.pageTitles["billing"], group: 'captain' },
  { id: 'coach-settings', route: '/captain/settings', title: m.pageTitles["coach-settings"], group: 'captain' },
  { id: 'pending', route: '/captain/pending', title: m.pageTitles["pending"], group: 'system' },
  { id: 'player-home', route: '/player', title: m.pageTitles["player-home"], group: 'player' },
  { id: 'workout', route: '/player/workout/[dayId]', title: m.pageTitles["workout"], group: 'player' },
  { id: 'nutrition', route: '/player/nutrition', title: m.pageTitles["nutrition"], group: 'player' },
  { id: 'progress', route: '/player/progress', title: m.pageTitles["progress"], group: 'player' },
  { id: 'history', route: '/player/history', title: m.pageTitles["history"], group: 'player' },
  { id: 'rank', route: '/player/rank', title: m.pageTitles["rank"], group: 'player' },
  { id: 'my-coach', route: '/player/captain', title: m.pageTitles["my-coach"], group: 'player' },
  { id: 'player-settings', route: '/player/settings', title: m.pageTitles["player-settings"], group: 'player' },
  { id: 'onboarding', route: '/player/onboarding', title: m.pageTitles["onboarding"], group: 'player' },
  { id: 'offline', route: '/offline', title: m.pageTitles["offline"], group: 'system' },
  { id: 'suspended', route: '/suspended', title: m.pageTitles["suspended"], group: 'system' },
  { id: 'admin', route: '/admin', title: m.pageTitles["admin"], group: 'system' },
  { id: 'dev-ui', route: '/dev/ui', title: m.pageTitles["dev-ui"], group: 'system' },
  { id: 'dev-ko', route: '/dev/ko', title: m.pageTitles["dev-ko"], group: 'system' },
];

export function pageFor(id) { return pages.find(page => page.id === id) ?? pages[0]; }
export function filterPlayers(roster, search) {
  const query = String(search).trim().toLocaleLowerCase('ar');
  return roster.filter(player => `${player.name} ${player.phone}`.toLocaleLowerCase('ar').includes(query));
}
