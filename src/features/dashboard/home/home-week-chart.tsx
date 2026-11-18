import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { homeV11Messages } from './messages';
import { weekChart } from './tasks';

const days = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
export async function HomeWeekChart({ sessions, today }: { sessions: { date: string }[]; today: string }) {
  const [t, locale] = await Promise.all([getT(homeV11Messages), getLocale()]);
  const chart = weekChart(sessions, today);
  if (process.env.NEXT_PUBLIC_CAPTAIN_WORKSPACE === '1') {
    const max = Math.max(1, ...chart.filter(day => day.date <= today).map(day => day.count));
    return <section className="glass min-w-0 rounded-card p-card">
      <header className="mb-stack flex items-center justify-between gap-inline">
        <h2 className="text-md font-semibold">{t('teamWorkouts')}</h2>
        <span className="text-xs text-muted">{t('thisWeek')}</span>
      </header>
      <ul aria-label={t('teamWorkouts')} className="grid grid-cols-7 gap-inline">
        {chart.map((day, index) => {
          const current = day.date === today;
          const future = day.date > today;
          const label = t(days[index] ?? 'saturday');
          const count = formatNumber(day.count, locale);
          return <li key={day.date} aria-current={current ? 'date' : undefined} className="min-w-0 text-center">
            <span className="sr-only">{t('chartDay', { day: label, count })}</span>
            <div aria-hidden="true" className="flex h-[110px] flex-col items-center justify-end gap-inline">
              {!future && <span className={`font-display text-micro font-bold tabular-nums ${current ? 'text-lime' : 'text-muted'}`}>{count}</span>}
              <span className={`block w-full max-w-[26px] rounded-md ${future ? 'bg-line-soft' : current ? 'bg-lime' : 'bg-lime/35'}`}
                style={{ height: future ? 4 : Math.max(4, day.count / max * 80) }} />
            </div>
            <span aria-hidden="true" className={`mt-stack block text-micro ${current ? 'font-bold text-ink' : 'text-muted'}`}>{label}</span>
          </li>;
        })}
      </ul>
      {!chart.some(day => day.count) && <p className="mt-stack text-center text-xs text-muted">{t('emptyChart')}</p>}
    </section>;
  }
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
