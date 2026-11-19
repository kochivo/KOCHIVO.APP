import Link from 'next/link';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { buttonClass } from '@/ui/button';
import { KoPlay } from '@/ui/icons/ko-play';
import { homeV11Messages } from './messages';
import { phoneHomeMessages } from './phone/messages';
import { taskEstimate } from './tasks';
import type { HomeTask } from './tasks';

export function PhoneHomeHero({ tasks, count, locale, style }: { tasks: HomeTask[]; count: number; locale: Locale; style?: ArabicStyle }) {
  const t = createT(phoneHomeMessages, locale, style), home = createT(homeV11Messages, locale, style);
  const number = (value: number) => formatNumber(value, locale);
  const first = tasks[0];
  const reviews = tasks.filter(task => task.kind === 'checkin' || task.kind === 'assessment' || task.kind === 'form').length;
  const payments = tasks.filter(task => task.kind === 'receipt' || task.kind === 'dues').length;
  const chips = [
    { key: 'reviews', count: reviews, tone: 'tone-lime' },
    { key: 'payments', count: payments, tone: 'tone-warn' },
    { key: 'other', count: count - reviews - payments, tone: 'tone-danger' },
  ] as const;
  return <section className="glass-strong ko-strip cut-corner relative overflow-hidden rounded-card p-card md:hidden">
    <span aria-hidden className="engraved pointer-events-none absolute end-0 top-0 origin-top scale-150 font-display text-stat-large-wide leading-none opacity-50">{number(count)}</span>
    <div className="relative space-y-stack">
      <p className="text-xs font-bold text-lime">{home('todayTasks')}</p>
      <h2 className="text-h font-bold">{count ? t('waiting', { n: count, count: number(count) }) : home('emptyHero')}</h2>
      {count > 0 && <>
        <p className="text-xs text-muted">{t('estimate', { n: taskEstimate(count), minutes: number(taskEstimate(count)) })}
          {first && <> · {t('first', { task: home(first.kind, { name: first.name, n: first.days ?? 0, days: first.days ?? 0 }) })}</>}</p>
        <ul className="flex flex-wrap gap-inline">{chips.filter(chip => chip.count > 0).map(chip =>
          <li key={chip.key} className={`rounded-md px-inline text-micro font-semibold ${chip.tone}`}>{t(chip.key, { n: chip.count, count: number(chip.count) })}</li>)}</ul>
        <Link href="/captain/tasks" className={buttonClass({ size: 'lg', block: true })}><KoPlay aria-hidden className="size-5" />{home('startTasks')}</Link>
      </>}
    </div>
  </section>;
}
