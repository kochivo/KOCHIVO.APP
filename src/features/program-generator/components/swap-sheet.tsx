'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { Button } from '@/ui/button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { Candidate } from '../pick';
import { messages } from '../messages';

export function dismissNested(event: { key: string; stopPropagation: () => void; preventDefault: () => void }, close: () => void) {
  if (event.key !== 'Escape') return;
  event.stopPropagation(); event.preventDefault(); close();
}

export function SwapSheet({ alternatives, onSelect, onClose }: {
  alternatives: readonly Candidate[]; onSelect: (id: string) => void; onClose: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  return <ResponsiveDialog modal fallbackId="generator-heading" onDismiss={onClose} aria-label={t('alternatives')}
    onKeyDownCapture={event => dismissNested(event, onClose)}
    dir={locale === 'ar' ? 'rtl' : 'ltr'}
    className="sheet fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg space-y-card-gap overflow-y-auto rounded-card border border-line bg-surface p-section text-ink">
    <h3 className="text-xl font-bold">{t('alternatives')}</h3>
    {!alternatives.length ? <p>{t('noAlternatives')}</p> : <ul className="space-y-inline">{alternatives.map(row => <li key={row.exercise_id}>
      <Button variant="secondary" className="min-h-12 w-full justify-start" onClick={() => onSelect(row.exercise_id)}>
        <bdi>{(row.library && exerciseName(row.library, locale)) || t('unavailable')}</bdi>
      </Button>
    </li>)}</ul>}
    <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} className="min-h-12" onClick={onClose}>{t('close')}</Button>
  </ResponsiveDialog>;
}
