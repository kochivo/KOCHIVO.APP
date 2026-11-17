'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useT } from '@/core/i18n/client';
import { daysBetween } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import type { RosterPlayer } from '../types';
import type { RosterMeta } from '../data/v6-roster';
import { messages } from './messages';
import { playerStatus } from './model';
import type { PlayerActivity } from './model';
import { WeekDots } from './week-dots';
import { buttonClass } from '@/ui/button';
import { LightDayEntry } from '@/features/captain-workspace';

export function PlayerRow({ player, today, meta, activity, mobile = false }: {
  player: RosterPlayer; today: string; meta?: RosterMeta; activity?: PlayerActivity; mobile?: boolean;
}) {
  const t = useT(messages), locale = useLocale();
  const n = (value: number) => formatNumber(value, locale);
  const days = Math.max(0, daysBetween(today, player.accessUntil));
  const status = playerStatus(player, today, activity?.video);
  const goal = meta && meta.target !== null ? t(meta.target < meta.weight ? 'lose' : meta.target > meta.weight ? 'gain' : 'maintain') : null;
  const avatarClass = `shrink-0 ${mobile ? 'size-[42px] rounded-[13px] text-md' : 'size-[38px] rounded-xl text-sm'}`;
  const avatar = player.avatarUrl ? <Image src={player.avatarUrl} alt="" width={42} height={42} unoptimized
    className={`${avatarClass} object-cover`} /> :
    <span aria-hidden className={`glass-strong grid place-items-center font-bold text-lime ${avatarClass}`}>{player.fullName.charAt(0)}</span>;
  const pill = <span className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full border px-stack text-micro font-medium ${
    status.tone === 'warn' ? 'border-warn/20 bg-warn/10 text-warn' : status.tone === 'calm' ? 'border-calm/20 bg-calm/10 text-calm' :
      status.tone === 'lime' ? 'border-lime/20 bg-lime/10 text-lime' : 'border-line bg-ink/5 text-muted'}`}>
    {t(status.key === 'good' ? 'okay' : status.key, { n: status.count, count: n(status.count) })}</span>;
  const dots = activity ? <WeekDots today={player.playerToday ?? today} startedOn={player.startedOn} activity={activity} /> : null;
  const href = `/captain/players/${player.playerId}`;
  if (mobile) return <Link href={href} prefetch={false}
    className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center gap-stack p-stack text-start focus-visible:outline-2 focus-visible:outline-lime" })}>
    {avatar}<div className="min-w-0 flex-1"><b className="block truncate text-sm">{player.fullName}</b>
      <small className="block text-xs text-muted">{goal ? `${goal} · ` : ''}{player.awaitingPlansAt ? t('waitingForPlans') : t('days', { n: days, count: n(days) })}</small>
      <div className="mt-inline">{dots}</div><LightDayEntry playerId={player.playerId} date={player.playerToday ?? today} /></div>{pill}
  </Link>;
  return <tr className="relative cursor-pointer border-b border-line-soft text-row last:border-0 hover:bg-ink/5">
    <td className="px-stack py-inline"><div className="flex items-center gap-stack">{avatar}<div className="min-w-0">
      <Link href={href} prefetch={false} className="block font-semibold after:absolute after:inset-0 after:min-h-12 focus-visible:text-lime">{player.fullName}</Link>
      {goal && <small className="block text-xs text-muted">{goal}</small>}</div>
      {activity?.rank && <span className="shrink-0 rounded-full bg-warn/10 px-inline py-inline text-micro font-extrabold text-warn">{t(activity.rank)}</span>}</div></td>
    <td className="px-stack py-inline">{dots}</td>
    <td className="px-stack py-inline tabular-nums">{meta ? n(meta.weight) : t('unknown')}</td>
    <td className="px-stack py-inline tabular-nums">{activity?.rpe != null ? n(activity.rpe) : t('unknown')}</td>
    <td className={`px-stack py-inline tabular-nums ${!player.awaitingPlansAt && days <= 3 ? 'text-warn' : ''}`}>{player.awaitingPlansAt ? t('waitingForPlans') : t('dayCount', { n: days, count: n(days) })}</td>
    <td className="space-y-inline px-stack py-inline">{pill}<LightDayEntry playerId={player.playerId} date={player.playerToday ?? today} /></td>
  </tr>;
}
