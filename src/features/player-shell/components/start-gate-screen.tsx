'use client';
import Link from 'next/link';
import { Check, Lock } from 'lucide-react';
import { KoForms } from '@/ui/icons/ko-forms';
import { KoSend } from '@/ui/icons/ko-send';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { loadStartGate } from '../data/start-gate';
import { messages } from '../start/messages';

export function StartGateScreen({ data, captain }: { data: Awaited<ReturnType<typeof loadStartGate>>; captain: string }) {
  const t = useT(messages), locale = useLocale();
  const done = data.rows.filter(row => row.answered_at).length;
  const next = data.rows.find(row => !row.answered_at);
  const linkClass = 'press glass inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-control border border-line px-4 hover:bg-ink/10 focus-visible:ring-2 focus-visible:ring-lime';
  return <section className="mx-auto max-w-lg space-y-5 px-5 pb-32 pt-6">
    <header><h1 className="text-2xl font-bold">{t('hello', { name: data.name })}</h1><p className="mt-3 text-sm leading-7 text-muted">{t('intro', { captain })}</p></header>
    <div><p className="mb-2 text-xs text-muted">{t('progress', { done: formatNumber(done, locale), total: formatNumber(data.rows.length, locale) })}</p>
      <progress aria-label={t('progress', { done, total: data.rows.length })} value={done} max={data.rows.length} className="h-2 w-full accent-lime" /></div>
    <ul className="space-y-3">{data.rows.map(row => <li key={row.id} className={`${row.answered_at ? 'glass' : 'glass-strong'} flex items-center gap-3 rounded-[20px] p-4`}>
      {row.answered_at ? <Check aria-hidden className="size-6" /> : <KoForms aria-hidden className="size-6" />}
      <b className="min-w-0 flex-1 text-sm">{row.title}</b>{row.answered_at ? <span className="text-xs text-muted">{t('done')}</span> :
        <Link href={`/${locale}/player/forms/${row.id}`} className={linkClass}>{t('start')}</Link>}
    </li>)}</ul>
    <p className="flex items-center gap-2 text-xs leading-6 text-muted"><Lock aria-hidden className="size-4 shrink-0" />{t('locked')}</p>
    <div className="flex flex-wrap gap-2"><Link href={`/${locale}/player/captain`} className={linkClass}>{t('chat')}</Link><Link href={`/${locale}/player/settings`} className={linkClass}>{t('settings')}</Link></div>
    {next && <div className="glass-strong fixed inset-x-0 bottom-[var(--page-bottom-clearance)] z-30 px-5 pb-[max(0.75rem,var(--safe-bottom))] pt-3">
      <Link href={`/${locale}/player/forms/${next.id}`} className="press mx-auto flex min-h-14 max-w-lg cursor-pointer items-center justify-center gap-2 rounded-control bg-lime px-4 font-bold text-on-lime focus-visible:ring-2 focus-visible:ring-lime"><KoSend aria-hidden className="size-5" />{t('next', { form: next.title })}</Link>
    </div>}
  </section>;
}
