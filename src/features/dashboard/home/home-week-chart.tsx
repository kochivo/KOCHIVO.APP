import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { homeV11Messages } from './messages';
import { weekChart } from './tasks';

const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
export async function HomeWeekChart({ sessions, today }: { sessions: { date: string }[]; today: string }) {
  const [t, locale] = await Promise.all([getT(homeV11Messages), getLocale()]);
  const chart = weekChart(sessions, today);
  const max = Math.max(1, ...chart.map(day => day.count));
  return <section className="glass min-w-0 rounded-[18px] p-card">
    <header className="mb-stack flex items-center gap-inline"><h2 className="text-md font-semibold">{t('teamWorkouts')}</h2><span className="ms-auto text-xs text-muted">{t('thisWeek')}</span></header>
    <div role="img" aria-label={t('teamWorkouts')} className="flex h-[110px] items-end gap-inline px-inline pt-inline">{chart.map((day, index) =>
      <div key={day.date} className={`min-w-0 flex-1 rounded-t-md rounded-b-[3px] ${day.passed ? 'bg-linear-to-b from-lime to-lime/75' : 'bg-surface-raised'}`}
        style={{ height: `${day.count / max * 100}%` }}><span className="sr-only">{t('chartDay', { day: t(days[index] ?? 'saturday'), count: formatNumber(day.count, locale) })}</span></div>)}</div>
    <div aria-hidden className="flex gap-inline px-inline pt-inline text-xs text-faint">{days.map(day => <span key={day} className="min-w-0 flex-1 text-center">{t(day)}</span>)}</div>
    {!chart.some(day => day.count) && <p className="mt-stack text-center text-xs text-muted">{t('emptyChart')}</p>}
  </section>;
}
