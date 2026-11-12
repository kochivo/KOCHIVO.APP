import Link from 'next/link';
import { ChevronRight, Send } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import { messages as formsMessages } from '../forms/messages';

export function WorkspaceHeader({ playerId, name, locale, view = 'training' }: { playerId: string; name: string; locale: Locale; view?: 'training' | 'forms' }) {
  const t = createT(messages, locale);
  const ft = createT(formsMessages, locale);
  const base = `/captain/players/${playerId}`;
  const tabs = [
    ['overview', base], ['training', `${base}/programs`], ['nutrition', `${base}/nutrition`],
    ['checkins', `${base}?tab=checkins`],
    ['forms', `${base}/programs?view=forms`],
  ] as const;
  return <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-line pb-4 lg:flex lg:flex-wrap lg:gap-4">
    <nav aria-label={t('breadcrumb')} className="flex min-w-0 items-center gap-2 text-sm">
      <Link href="/captain/players" className="inline-flex min-h-12 shrink-0 items-center text-muted">{t('players')}</Link>
      <ChevronRight aria-hidden strokeWidth={1.5} className="size-4 shrink-0 rtl:rotate-180" />
      <span className="truncate font-bold">{name}</span>
    </nav>
    <nav aria-label={t('tabs')} className="col-span-2 row-start-2 min-w-0 overflow-x-auto">
      <ul className="flex gap-1">{tabs.map(([label, href]) => <li key={label} className="shrink-0">
        <Link href={href} aria-current={label === view ? 'page' : undefined}
          className={`inline-flex min-h-12 items-center rounded-full px-3 text-sm ${label === view ? 'glass-strong font-bold' : 'text-muted'}`}>{label === 'forms' ? ft('forms') : t(label)}</Link>
      </li>)}</ul>
    </nav>
    {view === 'training' && <>
    <button type="button" className="hidden min-h-12 items-center gap-2 rounded-full bg-lime px-5 font-bold text-on-lime lg:inline-flex">
      <Send aria-hidden strokeWidth={1.5} className="size-4" />{t('send')}
    </button></>}
  </header>;
}
