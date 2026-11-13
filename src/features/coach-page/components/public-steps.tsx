import type { PublicT } from './public-types';

export function PublicSteps({ t }: { t: PublicT }) {
  const steps = [['step1Title', 'step1Body'], ['step2Title', 'step2Body'], ['step3Title', 'step3Body']] as const;
  return <section className="public-section">
    <p className="mb-3 text-sm text-lime">{t('fromDayOne')}</p>
    <h2 className="public-heading">{t('howTitle')}</h2>
    <ol className="mt-8 grid gap-6 md:grid-cols-3">
      {steps.map(([title, body], i) => <li key={title} className="glass rounded-card p-6">
        <span aria-hidden="true" className="font-display text-4xl text-lime">{String(i + 1).padStart(2, '0')}</span>
        <h3 className="my-4 text-xl font-bold">{t(title)}</h3><p className="leading-relaxed text-muted">{t(body)}</p>
      </li>)}
    </ol>
  </section>;
}
