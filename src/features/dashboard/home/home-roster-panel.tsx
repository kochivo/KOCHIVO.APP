import { getLocale, getT } from '@/core/i18n/server';
import { RadarCard, lastSeenLabel } from '@/features/roster';
import type { RosterPlayer } from '@/features/roster';
import { buildAlerts, dashboardStats, recentActivity } from '../alerts';
import { PlayerFinder } from '../components/player-finder';
import { SmartAlerts } from '../components/smart-alerts';
import { workspaceMessages } from '../workspace-messages';
import { formatNumber } from '@/lib/format';

export async function HomeRosterPanel({ players, dues, today }: { players: RosterPlayer[]; dues: [string, number][]; today: string }) {
  const [locale, t] = await Promise.all([getLocale(), getT(workspaceMessages)]);
  const stats = dashboardStats(players.filter(player => !player.pending && !player.frozenAt), today);
  const finder = (rows: RosterPlayer[]) => rows.map(player => ({ playerId: player.playerId, fullName: player.fullName,
    programTitle: player.programTitle, lastSeen: lastSeenLabel(player.lastTrainingDate, player.playerToday ?? today, locale) }));
  return <div className="space-y-4">
    <dl className="grid grid-cols-2 gap-3">{([{ key: 'lateCount', value: stats.late }, { key: 'endingCount', value: stats.ending }] as const).map(row =>
      <div key={row.key} className="glass-strong rounded-card p-4"><dt className="text-xs text-faint">{t(row.key)}</dt><dd className="mt-2 font-display text-[22px] font-extrabold">{formatNumber(row.value, locale)}</dd></div>)}</dl>
    <PlayerFinder players={finder(players)} recent={finder(recentActivity(players))} />
    <RadarCard today={today} showEmpty />
    <SmartAlerts alerts={buildAlerts(players, new Map(dues), today)} />
  </div>;
}
