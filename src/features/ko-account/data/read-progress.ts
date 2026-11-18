import { getTimezone } from '@/core/timezone/server';
import 'server-only';
import { createT } from '@/core/i18n/messages';
import { TIERS, ranksMessages } from '@/features/ranks';
import { daysBetween, formatDateAr, localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { endingSoon } from '@/lib/ending-soon';
import { resolvePlayer } from './account';
import type { KoActor } from './account';
import type { Intent } from './intents';
import { messages } from '../messages';

// Match award_session_points in migration 0081: max(1200s, planned time * 0.5), sets * 0.6.
export const WORKOUT_THRESHOLDS = { minimumSeconds: 1200, setsRatio: 0.6 } as const;
type ReadIntent = Extract<Intent, { kind: 'my_progress' | 'why_not_counted' | 'player_summary' | 'team_summary' }>;
type Locale = 'ar' | 'en';
type Translator = ReturnType<typeof createT<typeof messages>>;

function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw result.error;
  return result.data;
}
function count(result: { count: number | null; error: unknown }) {
  if (result.error) throw result.error;
  return result.count;
}
function shift(date: string, days: number) {
  const at = new Date(`${date}T12:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return localDate(at, 'UTC');
}
const dateText = (date: string, locale: Locale) => formatDateAr(date, { year: 'numeric', month: 'short', day: 'numeric' }, locale);
function rankText(tier: string | null | undefined, locale: Locale) {
  const known = TIERS.find(row => row.tier === tier);
  return known ? createT(ranksMessages, locale)(known.tier) : undefined;
}
export function progressMonth({ done, planned, adherence }: {
  done?: number | null; planned?: number | null; adherence?: number | null;
}) {
  return done != null && planned != null && adherence != null ? { done, planned, adherence } : null;
}

function monthText(row: Parameters<typeof progressMonth>[0], t: Translator, locale: Locale) {
  const month = progressMonth(row);
  return month ? t('progressMonth', { done: formatNumber(month.done, locale), planned: formatNumber(month.planned, locale),
    adherence: formatNumber(month.adherence, locale) }) : undefined;
}

async function myProgress(actor: KoActor, locale: Locale, today: string) {
  const t = createT(messages, locale);
  const [points, recent, scans] = await Promise.all([
    actor.db.rpc('my_points'),
    actor.db.from('workout_sessions').select('id', { count: 'exact', head: true })
      .eq('player_id', actor.id).not('completed_at', 'is', null)
      .gte('training_date', shift(today, -6)).lte('training_date', today),
    actor.db.from('body_scans').select('scan_date').eq('player_id', actor.id)
      .lte('scan_date', today).order('scan_date', { ascending: false }).limit(1),
  ]);
  const p = checked(points);
  const workouts = count(recent);
  const scan = checked(scans)?.[0];
  const lines: (string | undefined)[] = [];
  if (p) {
    const rank = rankText(p.tier, locale);
    if (rank && p.lifetime != null) lines.push(t('progressRank', { rank, points: formatNumber(p.lifetime, locale) }));
    if (p.lifetime != null) {
      const next = TIERS.find(row => row.threshold > p.lifetime);
      lines.push(next ? t('progressNext', { points: formatNumber(next.threshold - p.lifetime, locale),
        rank: createT(ranksMessages, locale)(next.tier) }) : t('progressTop'));
    }
    lines.push(monthText(p, t, locale));
    if (p.month_position != null) {
      lines.push(t('progressPosition', { position: formatNumber(p.month_position, locale) }));
      if (p.crown_needs_workouts > 0) lines.push(t('progressNeeds', { count: formatNumber(p.crown_needs_workouts, locale) }));
      else if (p.crown_gap != null) lines.push(p.crown_gap === 0 ? t('progressCrown')
        : t('progressGap', { count: formatNumber(p.crown_gap, locale) }));
    } else if (p.crown_needs_workouts > 0) lines.push(t('progressNeeds', { count: formatNumber(p.crown_needs_workouts, locale) }));
  }
  if (workouts != null) lines.push(t('progressWeek', { count: formatNumber(workouts, locale) }));
  if (scan?.scan_date) lines.push(t('progressScan', { date: dateText(scan.scan_date, locale) }));
  return lines.filter(Boolean).join('\n') || t('progressEmpty');
}

async function whyNotCounted(actor: KoActor, locale: Locale, today: string) {
  const t = createT(messages, locale);
  const rows = checked(await actor.db.from('points_log').select('source_key,status,earned_on')
    .eq('player_id', actor.id).eq('kind', 'workout').in('status', ['pending', 'rejected'])
    .gte('earned_on', shift(today, -13)).lte('earned_on', today)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1));
  const row = rows?.[0];
  if (!row) return t('countedAll');
  const session = checked(await actor.db.from('workout_sessions').select('started_at,completed_at,program_day_id')
    .eq('id', row.source_key).eq('player_id', actor.id).maybeSingle());
  if (!session?.completed_at || !session.started_at) return t('countUnknown');
  const [planResult, logs] = await Promise.all([
    session.program_day_id ? actor.db.from('program_exercises').select('sets,rest_seconds').eq('day_id', session.program_day_id)
      : Promise.resolve({ data: [], error: null }),
    actor.db.from('set_logs').select('id', { count: 'exact', head: true })
      .eq('session_id', row.source_key).eq('player_id', actor.id).is('deleted_at', null),
  ]);
  const plan = checked(planResult);
  const logged = count(logs);
  if (!plan || logged == null) return t('countUnknown');
  const plannedSets = plan.reduce((sum, exercise) => sum + exercise.sets, 0);
  const plannedSeconds = plan.reduce((sum, exercise) => sum + exercise.sets * (exercise.rest_seconds + 40), 0);
  const minSeconds = Math.max(WORKOUT_THRESHOLDS.minimumSeconds, plannedSeconds * 0.5);
  const seconds = (Date.parse(session.completed_at) - Date.parse(session.started_at)) / 1000;
  const date = dateText(row.earned_on, locale);
  const lines: string[] = [];
  if (Number.isFinite(seconds) && seconds < minSeconds)
    lines.push(t('countShort', { date, minutes: formatNumber(Math.ceil(minSeconds / 60), locale) }));
  const needed = Math.ceil(plannedSets * WORKOUT_THRESHOLDS.setsRatio);
  if (logged < needed) lines.push(t('countSets', { date, logged: formatNumber(logged, locale), needed: formatNumber(needed, locale) }));
  if (row.status === 'rejected' || !lines.length) lines.push(t(row.status === 'rejected' ? 'countRejected' : 'countPending', { date }));
  return lines.join('\n');
}

async function captainSummary(actor: KoActor, intent: Extract<ReadIntent, { kind: 'player_summary' | 'team_summary' }>,
  locale: Locale, today: string, context?: { id: string; name: string }) {
  const t = createT(messages, locale);
  const roster = checked(await actor.db.rpc('captain_roster'));
  if (intent.kind === 'team_summary') {
    if (!roster?.length) return t('teamEmpty');
    const links = checked(await actor.db.from('coach_clients').select('player_id,pending,frozen_at')
      .eq('captain_id', actor.id).is('archived_at', null));
    const board = checked(await actor.db.rpc('team_leaderboard', { p_month: `${today.slice(0, 7)}-01` }));
    const names = (rows: typeof roster) => rows.map(row => row.full_name).join('، ') || t('teamNone');
    const inactive = roster.filter(row => {
      const last = row.last_training_date || row.started_on;
      return last && daysBetween(last, today) >= 7;
    });
    const expiring = roster.filter(row => row.access_until && endingSoon(today, row.access_until)
      && links?.some(link => link.player_id === row.player_id && !link.pending && !link.frozen_at));
    const leader = board?.find(row => row.is_crown && roster.some(player => player.player_id === row.player_id));
    const zero = roster.filter(row => board?.some(entry => entry.player_id === row.player_id && entry.done === 0));
    return [t('teamInactive', { names: names(inactive) }), t('teamExpiring', { names: names(expiring) }),
      !board ? undefined : leader && leader.adherence != null ? t('teamCrown', { name: leader.display_name ||
        roster.find(row => row.player_id === leader.player_id)?.full_name || '', adherence: formatNumber(leader.adherence, locale) })
        : t('teamNoCrown'), board ? t('teamZero', { names: names(zero) }) : undefined].filter(Boolean).join('\n');
  }
  const target = intent.args.player === undefined && context ? context : await resolvePlayer(actor, intent.args.player);
  const player = roster?.find(row => row.player_id === target?.id);
  if (!player) return t('athlete');
  const [boardResult, swaps] = await Promise.all([
    actor.db.rpc('team_leaderboard', { p_month: `${today.slice(0, 7)}-01` }),
    actor.db.from('exercise_swap_requests').select('id', { count: 'exact', head: true })
      .eq('captain_id', actor.id).eq('player_id', player.player_id).eq('status', 'pending'),
  ]);
  const score = checked(boardResult)?.find(row => row.player_id === player.player_id);
  const open = count(swaps);
  const rank = rankText(score?.tier, locale);
  const details = [score ? monthText(score, t, locale) : undefined, rank ? t('summaryRank', { rank }) : undefined].filter(Boolean);
  const subscription = [open != null ? t('summarySwaps', { count: formatNumber(open, locale) }) : undefined,
    player.access_until ? t('summaryEnd', { date: dateText(player.access_until, locale) }) : undefined].filter(Boolean);
  return [t('target', { name: player.full_name }),
    player.last_training_date ? t('summaryLast', { date: dateText(player.last_training_date, locale) }) : undefined,
    details.join(' '), subscription.join(' ')].filter(Boolean).join('\n');
}

export async function readProgress(actor: KoActor, intent: ReadIntent, locale: Locale, now: number,
  context?: { id: string; name: string }): Promise<string> {
  const playerTool = intent.kind === 'my_progress' || intent.kind === 'why_not_counted';
  if ((actor.role === 'player') !== playerTool) return createT(messages, locale)('unclear');
  const today = localDate(new Date(now), await getTimezone());
  if (intent.kind === 'my_progress') return myProgress(actor, locale, today);
  if (intent.kind === 'why_not_counted') return whyNotCounted(actor, locale, today);
  return captainSummary(actor, intent, locale, today, context);
}
