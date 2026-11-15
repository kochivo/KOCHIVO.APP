import type { PublicT } from './public-types';

export function PublicSteps({ t }: { t: PublicT }) {
  const steps = [['step1Title', 'step1Body'], ['step2Title', 'step2Body'], ['step3Title', 'step3Body']] as const;
  return <section className="public-section">
    <p className="mb-stack text-sm text-lime">{t('fromDayOne')}</p>
    <h2 className="public-heading">{t('howTitle')}</h2>
    <ol className="mt-section grid gap-section md:grid-cols-3">
      {steps.map(([title, body], i) => <li key={title} className="glass rounded-card p-section">
        <span aria-hidden="true" className="font-display text-4xl text-lime">{String(i + 1).padStart(2, '0')}</span>
        <h3 className="my-card-gap text-xl font-bold">{t(title)}</h3><p className="leading-relaxed text-muted">{t(body)}</p>
      </li>)}
    </ol>
  </section>;
}
