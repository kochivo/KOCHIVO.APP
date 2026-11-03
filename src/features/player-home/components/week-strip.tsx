import { GlassCard } from '@/ui';
import { cn } from '@/lib/cn';
import type { WeekEntry } from '../week';

const states = { done: 'تم التمرين', today: 'النهارده', train: 'تمرين', rest: 'راحة' };

export function WeekStrip({ days, today }: { days: WeekEntry[]; today: string }) {
  return <GlassCard className="flex gap-1 p-2" role="list" aria-label="الأسبوع">
    {days.map((day) => <div key={day.date} role="listitem" aria-label={`${day.label} ${day.dayOfMonth}، ${states[day.state]}`}
      aria-current={day.date === today ? 'date' : undefined}
      className={cn('flex min-h-20 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control',
        day.date === today && 'outline-2 outline-lime', day.state === 'rest' && 'text-muted')}>
      <span className="text-[10px] text-muted">{day.label}</span>
      <span className="text-lg font-extrabold">{day.dayOfMonth}</span>
      <span aria-hidden className={cn('size-1.5 rounded-full', day.state === 'done' ? 'bg-lime' : day.state === 'train' ? 'border border-muted' : 'bg-transparent')} />
    </div>)}
  </GlassCard>;
}
