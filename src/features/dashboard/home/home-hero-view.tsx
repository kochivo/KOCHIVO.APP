import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import Link from 'next/link';
import { KoFollowup } from '@/ui/icons/ko-followup';
import { formatNumber } from '@/lib/format';
import type { homeV11Messages } from './messages';
import type { HomeTask } from './tasks';
import { taskEstimate, taskProgress } from './tasks';
import { ProgressBar } from '@/ui/progress-bar';
import { buttonClass } from '@/ui/button';
import { teamStatus } from './team-status';
import { PhoneHomeHero } from './phone-home-hero';

export function HomeHeroView({ t, locale, onSelect, tasks, count, completed, adherence, phone, style }: { t: Translator<typeof homeV11Messages>; locale: Locale; onSelect?: (href: string) => void; tasks: HomeTask[]; count: number; completed: number; adherence?: number; phone?: boolean; style?: ArabicStyle }) {
  const urgent = tasks.slice(0, 2).map(task => t(task.kind, { name: task.name, n: task.days ?? 0, days: task.days ?? 0 })).join(t('joinNames'));
  const desktop = <section data-home-hero className="glass-strong ko-strip cut-corner grid grid-cols-1 items-center gap-card-gap p-card min-[760px]:grid-cols-[auto_minmax(0,1fr)_auto]">
    <div className="flex items-center gap-inline min-[760px]:border-e min-[760px]:border-lime/20 min-[760px]:pe-card">
      <span className="engraved font-display text-stat-large leading-none font-extrabold tabular-nums">{formatNumber(count, locale)}</span>
      <span className="max-w-20 text-row text-muted">{t('todayTasks')}</span>
    </div>
    <div className="min-w-0"><span className="text-xs font-bold text-lime">{t('tag')}</span>
      <p className="max-w-[520px] text-sm leading-[1.9]">{count ? <>{t('heroLead')} <b className="font-semibold text-lime">{t('heroTasks', { n: count, count: formatNumber(count, locale) })}</b>{' '}
        {t('heroTime')} <b className="font-semibold text-lime">{t('minutes', { n: taskEstimate(count), count: formatNumber(taskEstimate(count), locale) })}</b>.{' '}
        {urgent && t('urgentLead', { tasks: urgent })}</> : t('emptyHero')}</p>
      {adherence !== undefined && <p className="text-sm text-muted">{t(teamStatus(adherence), { count: formatNumber(adherence, locale) })}</p>}
      {adherence !== undefined && adherence < 80 && <Link href="/captain/players" className={buttonClass({ variant: 'secondary', block: false })}>{t('viewPlayers')}</Link>}
      {count > 0 && <ProgressBar thin value={taskProgress(completed, count)} max={1} aria-label={t('progress')} className="mt-stack" />}
    </div>
    {count > 0 && <Link prefetch={onSelect ? false : undefined} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? '#/captain/tasks' : '/captain/tasks'} className={buttonClass({ variant: onSelect ? 'secondary' : 'primary', block: false })}><KoFollowup className="size-5" />{t('startTasks')}</Link>}
  </section>;
  return phone ? <div><div className="hidden md:block">{desktop}</div><PhoneHomeHero {...{ tasks, count, locale, style }} /></div> : desktop;
}

