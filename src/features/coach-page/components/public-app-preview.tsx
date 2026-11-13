import { Check, Dumbbell, MessageCircle, Utensils } from 'lucide-react';
import type { PublicT } from './public-types';

export function PublicAppPreview({ t }: { t: PublicT }) {
  const features = [[Dumbbell, 'trainingTitle', 'trainingBody'], [Utensils, 'foodTitle', 'foodBody'], [MessageCircle, 'chatTitle', 'chatBody']] as const;
  const sets = [['sampleBench', 'sampleBenchCount'], ['sampleIncline', 'sampleInclineCount'], ['sampleTriceps', 'sampleTricepsCount']] as const;
  return <section className="public-section grid items-center gap-12 md:grid-cols-2">
    <div><p className="mb-3 text-sm text-lime">{t('appEyebrow')}</p><h2 className="public-heading">{t('appTitle')}</h2>
      <ul className="mt-8 space-y-7">{features.map(([Icon, title, body]) => <li key={title} className="flex gap-4">
        <span className="glass flex size-12 shrink-0 items-center justify-center rounded-full"><Icon aria-hidden strokeWidth={1.5} className="size-5 text-lime" /></span>
        <div><h3 className="mb-2 text-xl font-bold">{t(title)}</h3><p className="max-w-md leading-relaxed text-muted">{t(body)}</p></div>
      </li>)}</ul>
    </div>
    <div role="img" aria-label={t('sampleLabel')} className="public-preview glass-strong mx-auto w-full max-w-72 rotate-[3deg] rounded-[2.5rem] p-3">
      <div className="space-y-5 rounded-[2rem] bg-bg-deep p-5">
        <div aria-hidden className="mx-auto h-1.5 w-16 rounded-full bg-line" />
        <p className="text-xs text-muted">{t('sampleDay')}</p><p className="text-lg font-bold">{t('sampleWorkout')}</p>
        <div className="divide-y divide-line">{sets.map(([name, count], index) => <div key={name} className="flex items-center justify-between gap-2 py-4 text-xs">
          <span>{t(name)}</span><span className="flex items-center gap-1 text-lime"><bdi>{t(count)}</bdi>{index < 2 && <Check aria-hidden strokeWidth={1.5} className="size-3" />}</span>
        </div>)}</div>
        <p className="text-xs text-muted">{t('sampleLunch')}</p>
        <div className="glass rounded-control p-4"><p className="text-sm font-bold">{t('sampleMeal')}</p><p dir="ltr" className="mt-3 text-xs text-muted">{t('sampleMacros')}</p></div>
        <div className="rounded-full bg-lime-soft p-3 text-center text-sm font-bold text-lime">{t('sampleContinue')}</div>
      </div>
    </div>
  </section>;
}
