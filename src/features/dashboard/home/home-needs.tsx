import 'server-only';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocale, getT } from '@/core/i18n/server';
import { formatDateAr } from '@/lib/dates';
import { whatsappUrl } from '@/lib/whatsapp';
import type { NeedRow } from './model';
import { homeMessages } from './messages';
import { homeAge } from './age';
import { buttonClass } from '@/ui/button';

export async function HomeNeeds({ rows, now, failed, contacts }: { rows: NeedRow[]; now: Date; failed: boolean; contacts: Map<string, string> }) {
  const [t, locale] = await Promise.all([getT(homeMessages), getLocale()]);
  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;
  return <section className="glass overflow-hidden rounded-card border border-line-soft">
    <header className="flex flex-wrap items-center gap-stack px-page-x pb-inline pt-card">
      <h2 className="min-w-0 flex-1 font-display text-title font-semibold">{t('needs')}</h2>
      <Link href="/captain/inbox" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center justify-center px-card text-xs" })}>{t('followup')}</Link>
    </header>
    {failed ? <p className="p-card text-sm text-faint">{t('failed')}</p> : rows.length === 0 && <p className="p-card text-sm text-faint">{t('allClear')}</p>}
    <ul className="divide-y divide-line-soft">{rows.map(row => {
      const badge = row.kind === 'absent' ? t('absent', { n: row.days }) : row.flags[0] ? t(row.flags[0]) : null;
      const danger = row.kind !== 'absent' && row.flags.some(flag => flag === 'high_soreness' || flag === 'assessmentAlert');
      const content = <>
        <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-full border border-line bg-surface-raised text-xs">{row.name.slice(0, 1)}</span>
        <div className="min-w-0 flex-1 text-sm"><p className="flex flex-wrap items-center gap-inline"><span className="break-words">{row.name}</span>{badge && <span className={`rounded-full px-stack py-inline text-micro ${row.kind === 'absent' ? 'bg-surface-raised text-muted' : danger ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'}`}>{badge}</span>}</p>
          <p className="mt-inline text-micro text-faint">{row.kind === 'absent' ? row.lastTrainingDate
            ? t('lastTraining', { day: formatDateAr(row.lastTrainingDate, { weekday: 'long' }, locale) }) : t('neverTrained')
            : t(row.title ? 'rowDetail' : 'rowAge', { kind: t(row.kind), title: row.title, age: homeAge(row.at, now, t) })}</p></div>
      </>;
      const rowClass = 'flex min-h-16 items-center gap-stack px-page-x py-card';
      if (row.kind !== 'absent') return <li key={`${row.kind}:${row.id}`}><Link href="/captain/inbox" className={rowClass}>{content}<Chevron className="size-4 shrink-0 text-faint" aria-hidden /></Link></li>;
      const phone = contacts.get(row.playerId);
      const href = phone ? whatsappUrl({ phone, text: t('reminder', { name: row.name }) }) : null;
      return <li key={row.id} className={rowClass}>{content}
        <a href={href ?? `/captain/players/${row.playerId}`} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined}
          aria-label={href ? t('messageName', { name: row.name }) : t('noPhone', { name: row.name })}
          className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 shrink-0 items-center justify-center px-card text-xs" })}>{t('message')}</a>
      </li>;
    })}</ul>
  </section>;
}
