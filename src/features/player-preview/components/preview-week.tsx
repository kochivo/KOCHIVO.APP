import type { activityWeek } from '../week';

export function PreviewWeek({ week, today }: { week: ReturnType<typeof activityWeek>; today: string }) {
  return <section className="space-y-3" aria-label="نشاط الأسبوع">
    <h2 className="font-bold">الأسبوع</h2>
    <ol className="space-y-2">{week.map((day) => <li key={day.date}
      aria-current={day.date === today ? 'date' : undefined} className={`glass rounded-control p-3 ${day.date === today ? 'border-lime' : ''}`}>
      <time dateTime={day.date} className="text-sm font-bold">{new Intl.DateTimeFormat('ar-EG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</time>
      <p className="text-sm text-muted">{day.trained ? 'اتمرّن' : 'مفيش تمرين متسجل'} · {day.mealsEaten} وجبات متسجلة</p>
    </li>)}</ol>
  </section>;
}
