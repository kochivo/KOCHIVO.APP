'use client';
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { KoForms } from '@/ui/icons/ko-forms';
import { KoSend } from '@/ui/icons/ko-send';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { loadStartGate } from '../data/start-gate';
import { messages } from '../start/messages';
import { buttonClass } from '@/ui/button';

export function StartGateScreen({ data, captain }: { data: Awaited<ReturnType<typeof loadStartGate>>; captain: string }) {
  const t = useT(messages), locale = useLocale();
  const done = data.rows.filter(row => row.answered_at).length;
  const next = data.rows.find(row => !row.answered_at);
  const linkClass = buttonClass({ variant: 'secondary', block: false });
  return <section className="mx-auto max-w-lg space-y-card-gap px-page-x pb-32 pt-section">
    <header><h1 className="text-2xl font-bold">{t('hello', { name: data.name })}</h1><p className="mt-stack text-sm leading-7 text-muted">{t('intro', { captain })}</p></header>
    <div><p className="mb-inline text-xs text-muted">{t('progress', { done: formatNumber(done, locale), total: formatNumber(data.rows.length, locale) })}</p>
      <progress aria-label={t('progress', { done, total: data.rows.length })} value={done} max={data.rows.length} className="h-2 w-full accent-lime" /></div>
    <ul className="space-y-stack">{data.rows.map(row => <li key={row.id} className={`${row.answered_at ? 'glass' : 'glass-strong'} flex items-center gap-stack rounded-[20px] p-card`}>
      {row.answered_at ? <Check aria-hidden className="size-6" /> : <KoForms aria-hidden className="size-6" />}
      <b className="min-w-0 flex-1 text-sm">{row.title}</b>{row.answered_at ? <span className="text-xs text-muted">{t('done')}</span> :
        <Link href={`/${locale}/player/forms/${row.id}`} className={linkClass}>{t('start')}</Link>}
    </li>)}</ul>
    <p className="flex items-center gap-inline text-xs leading-6 text-muted"><Lock aria-hidden className="size-4 shrink-0" />{t('locked')}</p>
    <div className="flex flex-wrap gap-inline"><Link href={`/${locale}/player/captain`} className={linkClass}>{t('chat')}</Link><Link href={`/${locale}/player/settings`} className={linkClass}>{t('settings')}</Link></div>
    {next && <div data-action-bar className="glass-strong fixed inset-x-0 bottom-[var(--page-bottom-clearance)] z-30 px-page-x pb-[max(0.75rem,var(--safe-bottom))] pt-stack">
      <Link href={`/${locale}/player/forms/${next.id}`} className={buttonClass({ variant: 'primary', block: false, className: "press mx-auto flex min-h-14 max-w-lg cursor-pointer items-center justify-center gap-inline px-page-x font-bold focus-visible:ring-2 focus-visible:ring-lime" })}><KoSend aria-hidden className="size-5" />{t('next', { form: next.title })}</Link>
    </div>}
  </section>;
}
