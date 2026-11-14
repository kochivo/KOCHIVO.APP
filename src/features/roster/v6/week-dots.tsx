import { useT } from '@/core/i18n/client';
import { saturdayWeek } from '@/lib/dates';
import { messages } from './messages';
import { weekDots } from './model';
import type { PlayerActivity } from './model';

export function WeekDots({ today, startedOn, activity }: { today: string; startedOn: string; activity: PlayerActivity }) {
  const t = useT(messages);
  const dates = saturdayWeek(today);
  return <span className="flex gap-[3px]" aria-label={t('week')}>
    {weekDots(today, activity.dates, activity.weekdays, startedOn).map((dot, index) =>
      <span key={dates[index]} role="img" aria-label={`${dates[index]}: ${t(dot === 'empty' ? 'emptyDot' : dot)}`}
        className={`size-2.5 rounded-[3px] ${dot === 'done' ? 'bg-lime' : dot === 'missed' ? 'bg-warn/55' : 'bg-ink/10'}`} />)}
  </span>;
}
