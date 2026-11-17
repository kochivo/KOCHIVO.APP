import type { Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import Link from 'next/link';
import { KoFollowup } from '@/ui/icons/ko-followup';
import { formatNumber } from '@/lib/format';
import type { homeV11Messages } from './messages';
import type { HomeTask } from './tasks';
import { taskEstimate, taskProgress } from './tasks';
import { HomeRing } from './home-ring';
import { buttonClass } from '@/ui/button';
import { teamStatus } from './team-status';

export function HomeHeroView({ t, locale, onSelect, tasks, count, completed, adherence }: { t: Translator<typeof homeV11Messages>; locale: Locale; onSelect?: (href: string) => void; tasks: HomeTask[]; count: number; completed: number; adherence?: number }) {
  const urgent = tasks.slice(0, 2).map(task => t(task.kind, { name: task.name, days: task.days ?? 0 })).join(t('joinNames'));
  return <section data-home-hero className="glass-strong grid grid-cols-1 items-center gap-stack overflow-hidden rounded-[24px] p-card min-[760px]:grid-cols-[auto_1fr_auto] min-[760px]:gap-section min-[760px]:px-page-x min-[760px]:py-page-y">
    <div className="hidden min-[760px]:block"><HomeRing value={taskProgress(completed, count)} size={96} label={t('progress')} /></div>
    <div><span className="mb-inline inline-flex rounded-full bg-lime px-stack py-inline text-micro font-extrabold text-on-lime shadow-lime-glow">{t('tag')}</span>
      <p className="max-w-[520px] text-sm leading-[1.9]">{count ? <>{t('heroLead')} <b className="font-semibold text-lime">{t('heroTasks', { count: formatNumber(count, locale) })}</b>{' '}
        {t('heroTime')} <b className="font-semibold text-lime">{t('minutes', { count: formatNumber(taskEstimate(count), locale) })}</b>.{' '}
        {urgent && t('urgentLead', { tasks: urgent })}</> : t('emptyHero')}</p>
      {adherence !== undefined && <p className="text-sm text-muted">{t(teamStatus(adherence), { count: formatNumber(adherence, locale) })}</p>}
      {adherence !== undefined && adherence < 80 && <Link href="/captain/players" className={buttonClass({ variant: 'secondary', block: false })}>{t('viewPlayers')}</Link>}
    </div>
    <div className="text-center"><div className="font-display text-stat-large leading-none font-extrabold tracking-[-.04em] tabular-nums min-[760px]:text-stat-large-wide">{formatNumber(count, locale)}</div>
      <p className="mt-inline text-row text-muted">{t('todayTasks')}</p>
      {count > 0 && <Link prefetch={onSelect ? false : undefined} onClick={onSelect ? event => { event.preventDefault(); onSelect((event.currentTarget.getAttribute('href') ?? '').replace(/^#/, '')); } : undefined} href={onSelect ? '#/captain/tasks' : '/captain/tasks'} className={buttonClass({ variant: 'primary', block: false, className: "mt-stack inline-flex min-h-12 w-full items-center justify-center gap-inline px-page-x text-sm font-semibold min-[760px]:w-auto" })}><KoFollowup className="size-[18px]" />{t('startTasks')}</Link>}
    </div>
  </section>;
}

