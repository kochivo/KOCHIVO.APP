import { getLocale, getT } from '@/core/i18n/server';
import { InviteButton } from '@/features/roster';
import { formatNumber } from '@/lib/format';
import { GlassCard } from '@/ui';
import { messages } from '../messages';

export async function StartStepsCard({ captainFirstName }: { captainFirstName: string }) {
  const [t, locale] = await Promise.all([getT(messages), getLocale()]);
  const steps = [
    { title: t('task.invite'), body: t('startInviteBody') },
    { title: t('startProgram'), body: t('startProgramBody') },
    { title: t('startNutrition'), body: t('startNutritionBody') },
  ];
  return <GlassCard data-tour="captain-home" level="strong" className="min-w-0 p-6">
    <h2 className="text-2xl font-extrabold">{t('startTitle')}</h2>
    <p className="mt-2 text-sm text-muted">{t('startSubtitle')}</p>
    <ol className="mt-6 divide-y divide-line">
      {steps.map((step, index) => <li key={step.title} className="flex min-w-0 gap-4 py-5 first:pt-0 last:pb-0">
        <span aria-hidden className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display font-bold ${index === 0 ? 'bg-lime text-on-lime' : 'bg-surface-raised text-muted'}`}>
          {formatNumber(index + 1, locale)}
        </span>
        <div className="min-w-0 space-y-2">
          <h3 className="font-bold"><span className={index === 0 ? 'text-ink' : 'text-muted'}>{step.title}</span></h3>
          <p className="text-sm text-muted">{step.body}</p>
          {index === 0 && <InviteButton captainFirstName={captainFirstName} label={t('taskInviteAction')} className="mt-2 min-h-14" />}
        </div>
      </li>)}
    </ol>
  </GlassCard>;
}
