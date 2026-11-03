'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { pickTodayDay } from '@/features/player-home';
import type { fetchPlayerPreview } from '../data/preview';
import { PhoneFrame } from './phone-frame';
import { PreviewProgram } from './preview-program';
import { PreviewNutrition } from './preview-nutrition';
import { PreviewWeek } from './preview-week';

type Result = Awaited<ReturnType<typeof fetchPlayerPreview>>;
const tabs = ['النهارده', 'البرنامج', 'الأكل', 'الأسبوع'];

export function PreviewScreen({ result, today }: { result: Result; today: string }) {
  const [tab, setTab] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const data = result.data;
  const day = data?.program ? pickTodayDay(data.program, data.sessions, today) : undefined;
  const rest = data?.program && data.program.training_days.length > 0 &&
    !data.program.training_days.includes(new Date(`${today}T12:00:00Z`).getUTCDay()) &&
    !data.sessions.some((session) => session.training_date === today && data.program?.days.some((entry) => entry.id === session.program_day_id));
  return <main className="mx-auto max-w-4xl space-y-6 p-4" dir="rtl">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold">معاينة كلاعب · {data?.name ?? 'اللاعب'}</h1>
      <Link href="/captain" className="flex min-h-12 items-center text-lime">رجوع للاعبين</Link>
    </header>
    <PhoneFrame>
      <p className="shrink-0 p-3 text-center text-xs text-muted">ده عرض بس. أي تعديل من البرنامج أو النظام</p>
      <nav aria-label="أقسام المعاينة" className="grid shrink-0 grid-cols-4 gap-1 border-b border-line pb-2">
        {tabs.map((label, index) => <button type="button" key={label} aria-current={tab === index ? 'page' : undefined}
          onClick={() => setTab(index)} className={`min-h-12 rounded-control text-xs ${tab === index ? 'bg-lime-soft font-bold text-lime' : 'text-muted'}`}>{label}</button>)}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {pending ? <p role="status">جاري تحميل المعاينة</p> : result.error ? <div role="alert" className="space-y-3">
            <p>{result.error}</p><button type="button" className="min-h-12 text-lime" onClick={() => startTransition(() => router.refresh())}>جرّب تاني</button>
          </div> : data && <>
            {tab === 0 && <div className="space-y-4">
              <p className="font-bold">أهلاً يا {data.name}</p>
              <ol aria-label="أيام الأسبوع" className="glass grid grid-cols-7 rounded-control p-2">
                {data.week.map((entry) => <li key={entry.date} aria-current={entry.date === today ? 'date' : undefined}
                  className={`py-2 text-center text-xs ${entry.date === today ? 'rounded-control bg-lime-soft text-lime' : 'text-muted'}`}>
                  <span>{new Intl.DateTimeFormat('ar-EG', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${entry.date}T12:00:00Z`))}</span>
                  <p className="font-bold">{Number(entry.date.slice(-2))}</p>
                  <span>{entry.trained ? 'اتمرّن' : !data.program ? '—' : data.program.training_days.length === 0 ||
                    data.program.training_days.includes(new Date(`${entry.date}T12:00:00Z`).getUTCDay()) ? 'تمرين' : 'راحة'}</span>
                </li>)}
              </ol>
              <section className="glass-strong space-y-3 rounded-card p-4">
                <h2 className="text-xl font-bold">{!data.program ? 'لسه مفيش برنامج متفعل' : rest ? 'النهارده راحة' : day?.title ?? 'لسه مفيش أيام في البرنامج'}</h2>
                {day && <><p className="text-sm text-muted">{rest && `${day.title} · `}{day.exercises.length} تمارين · {day.exercises.reduce((count, exercise) => count + exercise.sets, 0)} سِت</p>
                  <PreviewProgram program={data.program ? { ...data.program, days: [day] } : null} /></>}
              </section>
            </div>}
            {tab === 1 && <PreviewProgram program={data.program} />}
            {tab === 2 && <PreviewNutrition nutrition={data.nutrition} />}
            {tab === 3 && <PreviewWeek week={data.week} today={today} />}
          </>}
      </div>
    </PhoneFrame>
  </main>;
}
