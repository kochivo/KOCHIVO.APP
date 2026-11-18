import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatDateAr, saturdayWeek } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { StatStrip } from '@/ui/stat-strip';
import type { FileSummary, Profile } from './types';
import type { FileActivity } from './load-activity';
import { overviewMetrics } from './overview-metrics';
import { messages } from './messages';
import { v11Messages } from './v11-messages';
import { phoneMessages } from './phone/messages';

export function PhoneOverview({ summary, profile, activity, today, locale, style }: {
  summary: FileSummary; profile: Profile; activity: FileActivity; today: string; locale: Locale; style?: ArabicStyle;
}) {
  const t = createT(messages, locale, style), vt = createT(v11Messages, locale, style), phone = createT(phoneMessages, locale, style);
  const n = (value: number) => formatNumber(value, locale);
  const weight = overviewMetrics(profile, activity).find(metric => metric.key === 'weight');
  const planned = summary.file.facts.trainingDays?.value.length ?? profile.program?.days ?? 0;
  const completed = summary.completedDays;
  const change = weight?.change;
  return <div className="space-y-card-gap md:hidden">
    <StatStrip items={[
      ...(weight ? [{ label: t('weight'), value: n(weight.value), unit: t('kg'),
        delta: change == null ? undefined : `${change < 0 ? '−' : '+'}${n(Math.abs(change))}` }] : []),
      ...(planned ? [{ label: t('adherence'), value: `${n(Math.round(completed / planned * 100))}%` }] : []),
    ]} />
    <section className="glass space-y-stack rounded-card p-card">
      <div className="flex items-center justify-between gap-inline">
        <h2 className="text-row font-bold">{phone('week')}</h2>
        {planned > 0 && <p className="text-micro text-muted">{vt('adherenceText', { done: n(completed), planned: n(planned) })}</p>}
      </div>
      <ul className="grid grid-cols-7 gap-inline">
        {saturdayWeek(today).map(date => {
          const done = summary.completedDates?.includes(date);
          const label = formatDateAr(date, { weekday: 'long' }, locale);
          return <li key={date} title={label} className={`grid min-h-8 place-items-center rounded-control text-micro ${done ? 'bg-lime font-bold text-on-lime' : 'bg-ink/5 text-muted'}`}>
            <span className="sr-only">{phone('dayStatus', { day: label, status: phone(done ? 'trained' : 'unlogged') })}</span>
            <span aria-hidden>{formatDateAr(date, { weekday: 'narrow' }, locale)}</span>
          </li>;
        })}
      </ul>
    </section>
  </div>;
}
