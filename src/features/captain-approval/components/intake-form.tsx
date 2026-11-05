'use client';
import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AtSign, Loader2 } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { saveIntake } from '../data/intake';
import { intakeSchema } from '../schemas';
import { messages } from '../intake/messages';
import { IntakeRadioGroup } from './intake-radio-group';

export function IntakeForm({ fullName, whatsapp = '', instagram = '' }: {
  fullName: string; whatsapp?: string; instagram?: string;
}) {
  const t = useT(messages);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = intakeSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    setError('');
    if (!parsed.success) { setError(t('invalid')); return; }
    start(async () => {
      try {
        const result = await saveIntake(parsed.data);
        if (result.error) { setError(result.error); return; }
        router.refresh();
      } catch { setError(t('failed')); }
    });
  }
  const inputClass = 'glass min-h-12 w-full rounded-control border border-line px-4';
  return <form onSubmit={submit} aria-labelledby="intake-title" aria-busy={pending} className="glass-strong w-full max-w-2xl space-y-6 rounded-card p-6">
    <h1 id="intake-title" className="text-2xl font-bold">{t('title')}</h1>
    <p className="text-muted">{t('description')}</p>
    <label className="block space-y-2"><span>{t('fullName')}</span>
      <input name="full_name" autoComplete="name" defaultValue={fullName} required maxLength={80} disabled={pending} className={inputClass} />
    </label>
    <label className="block space-y-2"><span>{t('whatsapp')}</span>
      <input name="whatsapp" type="tel" autoComplete="tel" dir="ltr" defaultValue={whatsapp} required disabled={pending} className={inputClass} />
    </label>
    <label className="block space-y-2"><span className="flex items-center gap-2"><AtSign aria-hidden className="size-5" />{t('instagram')}</span>
      <input name="instagram" dir="ltr" defaultValue={instagram} maxLength={200} disabled={pending} className={inputClass} />
    </label>
    <IntakeRadioGroup name="current_tool" options={['whatsapp_excel', 'other_app', 'just_starting']} disabled={pending} />
    <IntakeRadioGroup name="main_challenge" options={['time_on_tables', 'tracking_progress', 'unprofessional_look']} disabled={pending} />
    <IntakeRadioGroup name="players_range" options={['1-10', '11-50', '50+']} disabled={pending} />
    {error && <p role="alert" className="text-danger">{error}</p>}
    <Button type="submit" disabled={pending} className="min-h-12 w-full">
      {pending && <Loader2 aria-hidden className="size-5 motion-safe:animate-spin motion-reduce:animate-none" />}
      {t(pending ? 'submitting' : 'submit')}
    </Button>
  </form>;
}
