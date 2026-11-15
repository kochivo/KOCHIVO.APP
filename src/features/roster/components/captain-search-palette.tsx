'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { frameMessages } from './captain-frame-messages';
import { frameItems } from './captain-frame-model';
import type { CaptainFrameData } from './captain-frame-data';
import { buttonClass } from '@/ui/button';

export function CaptainSearchPalette({ players, onClose }: { players: CaptainFrameData['players']; onClose: () => void }) {
  const t = useT(frameMessages);
  const id = useId();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const matches = [
    ...(players ?? []).map(player => ({ href: `/captain/players/${player.id}`, label: player.name, group: 'players' as const })),
    ...frameItems.filter(item => item.available).map(item => ({ href: item.href, label: t(item.id), group: 'work' as const })),
  ].filter(item => item.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <ResponsiveDialog modal aria-label={t('search')} fallbackId="captain-search" openerId="captain-search" onDismiss={onClose}
    className="sheet fixed inset-x-4 top-[12dvh] mx-auto max-h-[75dvh] w-auto max-w-xl overflow-y-auto rounded-card border border-line bg-surface p-stack text-ink backdrop:bg-bg/70">
    <div className="flex items-center gap-inline">
      <input ref={input} role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls={id}
        aria-activedescendant={matches[selected] ? `${id}-${selected}` : undefined}
        aria-label={t('search')} placeholder={t('search')} value={query}
        onChange={event => { setQuery(event.target.value); setSelected(0); }}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setSelected(index => matches.length ? (index + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length : 0);
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const link = event.currentTarget.closest('dialog')?.querySelector<HTMLAnchorElement>(`[data-result="${selected}"]`);
            link?.click();
          }
        }} className="min-h-12 min-w-0 flex-1 rounded-control border border-line bg-bg px-stack text-sm" />
      <button type="button" onClick={onClose} aria-label={t('close')} className="flex min-h-12 min-w-12 items-center justify-center"><X className="size-5" aria-hidden /></button>
    </div>
    {players === null && <p role="status" className="p-stack text-sm text-muted">{t('unavailable')}</p>}
    <div id={id} role="listbox" aria-label={t('search')} className="mt-inline space-y-inline">{matches.length ? matches.map((item, index) => <Link key={item.href} href={item.href}
      id={`${id}-${index}`} role="option" aria-selected={selected === index} data-result={index} onClick={onClose} onFocus={() => setSelected(index)}
      className={buttonClass({ variant: 'secondary', block: false, className: `flex min-h-12 items-center gap-stack px-stack text-sm ${selected === index ? "text-lime" : "text-ink"} ` })}>
      {item.label}<small className="ms-auto text-faint">{t(item.group)}</small>
    </Link>) : <p className="p-stack text-sm text-muted">{t('empty')}</p>}</div>
  </ResponsiveDialog>;
}
