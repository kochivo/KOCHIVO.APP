'use client';
import { useRef } from 'react';
import { Archive, EllipsisVertical, Pencil, Plus, Trophy } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button, buttonClass } from '@/ui/button';
import { messages } from './messages';
import type { Tier } from './types';

export function WorkspaceTierOptions({ tier, busy, onEdit, onAdd, onFeature, onArchive }: {
  tier: Tier; busy: boolean; onEdit: () => void; onAdd: () => void; onFeature: () => void; onArchive: () => void;
}) {
  const t = useT(messages);
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  function close(focus: boolean) {
    if (details.current) details.current.open = false;
    if (focus) trigger.current?.focus();
  }
  const actions = [
    { label: t('editPackage'), icon: Pencil, run: onEdit },
    { label: t('addDurationAction'), icon: Plus, run: onAdd },
    { label: t(tier.is_featured ? 'unfeature' : 'feature'), icon: Trophy, run: onFeature },
  ];
  return <details ref={details} className="relative shrink-0"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close(false); }}
    onKeyDown={event => { if (event.key === 'Escape' && details.current?.open) { event.stopPropagation(); close(true); } }}>
    <summary ref={trigger} aria-label={t('menu', { name: tier.name })}
      className={buttonClass({ variant: 'secondary', block: false, className: 'size-12 list-none p-0 [&::-webkit-details-marker]:hidden' })}>
      <EllipsisVertical aria-hidden className="size-4" />
    </summary>
    <div className="sheet absolute end-0 top-full z-10 w-56 rounded-card border border-line bg-surface-raised p-inline shadow-lg">
      {actions.map(({ label, icon: Icon, run }) => <Button key={label} variant="ghost" disabled={busy}
        className="w-full justify-start gap-inline px-inline text-start" onClick={() => { close(true); run(); }}>
        <Icon aria-hidden className="size-4 shrink-0" />{label}
      </Button>)}
      <div className="border-t border-line-soft">
        <Button variant="ghost" disabled={busy} className="w-full justify-start gap-inline px-inline text-start text-danger!"
          onClick={() => { close(true); onArchive(); }}>
          <Archive aria-hidden className="size-4 shrink-0" />{t('archive')}
        </Button>
      </div>
    </div>
  </details>;
}
