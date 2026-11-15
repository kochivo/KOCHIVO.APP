import Link from 'next/link';
import { getLocale, getT } from '@/core/i18n/server';
import { KoFollowup } from '@/ui/icons/ko-followup';
import { formatNumber } from '@/lib/format';
import { homeV11Messages } from './messages';
import type { HomeTask } from './tasks';
import { taskEstimate, taskProgress } from './tasks';
import { HomeRing } from './home-ring';
import { buttonClass } from '@/ui/button';

export async function HomeHero({ tasks, count, completed }: { tasks: HomeTask[]; count: number; completed: number }) {
  const [t, locale] = await Promise.all([getT(homeV11Messages), getLocale()]);
  const urgent = tasks.slice(0, 2).map(task => t(task.kind, { name: task.name, days: task.days ?? 0 })).join(t('joinNames'));
  return <section data-home-hero className="glass-strong grid grid-cols-1 items-center gap-3 overflow-hidden rounded-[24px] p-[18px] min-[760px]:grid-cols-[auto_1fr_auto] min-[760px]:gap-[22px] min-[760px]:px-6 min-[760px]:py-[22px]">
    <div className="hidden min-[760px]:block"><HomeRing value={taskProgress(completed, count)} size={96} label={t('progress')} /></div>
    <div><span className="mb-2 inline-flex rounded-full bg-lime px-[9px] py-[3px] text-[11px] font-extrabold text-on-lime shadow-lime-glow">{t('tag')}</span>
      <p className="max-w-[520px] text-sm leading-[1.9]">{count ? <>{t('heroLead')} <b className="font-semibold text-lime">{t('heroTasks', { count: formatNumber(count, locale) })}</b>{' '}
        {t('heroTime')} <b className="font-semibold text-lime">{t('minutes', { count: formatNumber(taskEstimate(count), locale) })}</b>.{' '}
        {urgent && t('urgentLead', { tasks: urgent })}</> : t('emptyHero')}</p></div>
    <div className="text-center"><div className="font-display text-[52px] leading-none font-extrabold tracking-[-.04em] tabular-nums min-[760px]:text-[64px]">{formatNumber(count, locale)}</div>
      <p className="mt-1.5 text-[13px] text-muted">{t('todayTasks')}</p>
      {count > 0 && <Link href="/captain/inbox" className={buttonClass({ variant: 'primary', block: false, className: "mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 px-6 text-sm font-semibold min-[760px]:w-auto" })}><KoFollowup className="size-[18px]" />{t('startTasks')}</Link>}
    </div>
  </section>;
}
