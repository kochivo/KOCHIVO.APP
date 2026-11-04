import { getT } from '@/core/i18n/server';
import { getContent } from '../content';
import { messages } from '../messages';
import { ReadinessMuscles } from './readiness-muscles';

export async function ReadinessSection() {
  const content = getContent(await getT(messages));
  const r = content.readiness;
  return <section className="marketing-wrap marketing-section space-y-8">
    <div className="max-w-[760px] space-y-3">
      <p className="marketing-eyebrow">{r.label}</p><h2 className="marketing-heading">{r.title}</h2>
      <p className="text-lg leading-relaxed text-muted">{r.description}</p>
    </div>
    <p className="text-xs text-muted">{content.preview.label}</p>
    <div className="grid gap-4 md:grid-cols-3">
      <article className="glass flex flex-col gap-4 rounded-[28px] p-6">
        <div className="glass-strong relative mx-auto grid size-48 place-items-center rounded-full">
          <svg aria-hidden="true" viewBox="0 0 200 200" className="absolute inset-0 size-full -rotate-90" fill="none" strokeWidth="8">
            {[84, 68, 52].map(radius => <circle key={radius} cx="100" cy="100" r={radius} className="stroke-line" />)}
            <circle cx="100" cy="100" r="84" pathLength="100" strokeDasharray="72 100" strokeLinecap="round" className="stroke-sleep" />
            <circle cx="100" cy="100" r="68" pathLength="100" strokeDasharray="50 100" strokeLinecap="round" className="stroke-water" />
            <circle cx="100" cy="100" r="52" pathLength="100" strokeDasharray="85 100" strokeLinecap="round" className="stroke-sore" />
          </svg>
          <p className="text-4xl font-extrabold">{r.score}</p>
        </div>
        <p className="text-center text-xs text-muted">{r.ringLabels}</p>
        <h3 className="text-xl font-extrabold">{r.rings}</h3><p className="text-sm leading-relaxed text-muted">{r.ringsDescription}</p>
      </article>
      <article className="glass flex flex-col gap-4 rounded-[28px] p-6">
        <div className="glass-strong flex min-h-48 flex-col justify-center gap-4 rounded-card p-4">
          <div><p className="mb-2 text-xs text-muted">{r.original}</p><svg aria-hidden="true" viewBox="0 0 180 12" className="h-3 w-full"><rect width="180" height="12" rx="6" className="fill-muted" /></svg></div>
          <div><p className="mb-2 text-xs text-lime">{r.suggested}</p><svg aria-hidden="true" viewBox="0 0 180 12" className="h-3 w-full"><rect width="140" height="12" rx="6" className="fill-lime" /></svg></div>
        </div>
        <h3 className="text-xl font-extrabold">{r.decision}</h3><p className="text-sm leading-relaxed text-muted">{r.decisionDescription}</p>
        <span className="mt-auto self-start rounded-full bg-lime-soft px-3 py-2 text-xs font-bold text-lime">{r.apply}</span>
      </article>
      <article className="glass flex flex-col gap-4 rounded-[28px] p-6">
        <ReadinessMuscles />
        <p className="text-xs text-muted">{r.pushPull}</p>
        <h3 className="text-xl font-extrabold">{r.muscles}</h3><p className="text-sm leading-relaxed text-muted">{r.muscleDescription}</p>
      </article>
    </div>
  </section>;
}
