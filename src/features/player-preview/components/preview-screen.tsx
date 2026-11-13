'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';
import { formatNumber } from '@/lib/format';
import { localeDir } from '@/core/i18n/locale';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { formatDateAr } from '@/lib/dates';
import type { fetchPlayerPreview } from '../data/preview';
import { PhoneFrame } from './phone-frame';
import { PreviewProgram } from './preview-program';
import { PreviewNutrition } from './preview-nutrition';
import { PreviewWeek } from './preview-week';
import { starterText } from '@/lib/starter-text';

type Result = Awaited<ReturnType<typeof fetchPlayerPreview>>;

export function PreviewScreen({ result, today }: { result: Result; today: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const tabs = [t('today'), t('program'), t('nutrition'), t('week')];
  const [tab, setTab] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const data = result.data;
  const day = data?.todayDay;
  const rest = data?.program && data.program.training_days.length > 0 &&
    !data.program.training_days.includes(new Date(`${today}T12:00:00Z`).getUTCDay()) &&
    !data.sessions.some((session) => session.training_date === today && data.program?.days.some((entry) => entry.id === session.program_day_id));
  return <main className="mx-auto max-w-4xl space-y-6 p-4" dir={localeDir(locale)}>
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold">{t('preview', { name: data?.name ?? t('player') })}</h1>
      <Link href="/captain" className="flex min-h-12 items-center text-lime">{t('back')}</Link>
    </header>
    <PhoneFrame>
      <p className="shrink-0 p-3 text-center text-xs text-muted">{t('readOnly')}</p>
      <nav aria-label={t('sections')} className="grid shrink-0 grid-cols-4 gap-1 border-b border-line pb-2">
        {tabs.map((label, index) => <button type="button" key={label} aria-current={tab === index ? 'page' : undefined}
          onClick={() => setTab(index)} className={`min-h-12 rounded-control text-xs ${tab === index ? 'bg-lime-soft font-bold text-lime' : captainWorkspaceEnabled() ? 'glass border border-line text-ink' : 'text-muted'}`}>{label}</button>)}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {pending ? <p role="status">{t('loading')}</p> : result.error ? <div role="alert" className="space-y-3">
            <p>{result.error}</p>{captainWorkspaceEnabled() ? <Button variant="secondary" type="button" className="min-h-12 text-ink" onClick={() => startTransition(() => router.refresh())}>{t('retry')}</Button> : <button type="button" className="min-h-12 text-lime" onClick={() => startTransition(() => router.refresh())}>{t('retry')}</button>}
          </div> : !data ? <EmptyState icon={Users} title={t('unavailable')} body={t('emptyBody')} action={{ label: t('openPlayers'), href: '/captain/players' }} /> : <>
            {tab === 0 && <div className="space-y-4">
              <p className="font-bold">{t('hello', { name: data.name })}</p>
              <ol aria-label={t('weekdays')} className="glass grid grid-cols-7 rounded-control p-2">
                {data.week.map((entry) => <li key={entry.date} aria-current={entry.date === today ? 'date' : undefined}
                  className={`py-2 text-center text-xs ${entry.date === today ? 'rounded-control bg-lime-soft text-lime' : 'text-muted'}`}>
                  <span>{formatDateAr(entry.date, { weekday: 'short' }, locale)}</span>
                  <p className="font-bold">{formatNumber(Number(entry.date.slice(-2)), locale)}</p>
                  {/* A dot like the player's own strip: words do not fit seven 40px columns in English. */}
                  <span className="sr-only">{entry.trained ? t('trained') : !data.program ? t('dash') : data.program.training_days.length === 0 ||
                    data.program.training_days.includes(new Date(`${entry.date}T12:00:00Z`).getUTCDay()) ? t('training') : t('restDay')}</span>
                  <span aria-hidden className={`mx-auto mt-1 block size-1.5 rounded-full ${entry.trained ? 'bg-lime' : 'border border-muted'}`} />
                </li>)}
              </ol>
              <section className="glass-strong space-y-3 rounded-card p-4">
                <h2 className="text-xl font-bold">{!data.program ? t('noProgram') : rest ? t('todayRest') : day ? starterText(day.title, locale) : t('noDays')}</h2>
                {day && <><p className="text-sm text-muted">{rest && `${starterText(day.title, locale)} · `}{t('exercises', { n: day.exercises.length, count: formatNumber(day.exercises.length, locale) })} · {t('sets', { n: day.exercises.reduce((count, exercise) => count + exercise.sets, 0), count: formatNumber(day.exercises.reduce((count, exercise) => count + exercise.sets, 0), locale) })}</p>
                  <PreviewProgram program={data.program ? { ...data.program, days: [day] } : null} /></>}
                {!day && <PreviewProgram program={data.program} />}
              </section>
            </div>}
            {tab === 1 && <PreviewProgram program={data.program} />}
            {tab === 2 && <PreviewNutrition nutrition={data.nutrition} />}
            {tab === 3 && <PreviewWeek week={data.week} today={today} sessions={data.feedbackSessions} />}
          </>}
      </div>
    </PhoneFrame>
  </main>;
}
