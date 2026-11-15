import 'server-only';
import { getT } from '@/core/i18n/server';
import { homeMessages } from './messages';
import { HomeInvite } from './home-invite';

export async function HomeStart({ name }: { name: string }) {
  const t = await getT(homeMessages);
  const steps = [{ title: 'stepInvite', body: 'inviteBody' }, { title: 'stepProgram', body: 'programBody' },
    { title: 'stepFood', body: 'foodBody' }] as const;
  return <section data-tour="captain-home" className="glass rounded-card border border-line-soft p-card">
    <h2 className="font-display text-title font-semibold">{t('start')}</h2>
    <ol className="mt-card-gap divide-y divide-line-soft">{steps.map((step, index) => <li key={step.title} className="flex gap-card-gap py-page-y">
      <span aria-hidden className={`grid size-8 shrink-0 place-items-center rounded-full font-display text-xs font-extrabold ${index === 0 ? 'bg-lime text-on-lime' : 'border border-line text-muted'}`}>{index + 1}</span>
      <div className="space-y-inline"><h3 className="text-sm font-semibold">{t(step.title)}</h3><p className="text-xs text-faint">{t(step.body)}</p>
        {index === 0 && <HomeInvite name={name} label={t('invite')} />}</div>
    </li>)}</ol>
  </section>;
}
