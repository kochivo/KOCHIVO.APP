import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import { canGoNext, monthLabel, nextMonth, previousMonth } from '../months';

export function MonthSwitch({ month, now, locale, onChange }: {
  month: string; now: Date; locale: Locale; onChange: (month: string) => void;
}) {
  const t = createT(messages, locale);
  return <div className="flex items-center justify-between gap-3">
    {captainWorkspaceEnabled() ? <IconButton className="min-h-12 min-w-12" aria-label={t('previous')}
      onClick={() => onChange(previousMonth(month))}><ChevronLeft aria-hidden className="size-5 rtl:rotate-180" /></IconButton> : <Button variant="ghost" className="min-h-12 min-w-12" aria-label={t('previous')}
      onClick={() => onChange(previousMonth(month))}><ChevronLeft aria-hidden className="size-5 rtl:rotate-180" /></Button>}
    <h2 className="font-bold" aria-live="polite">{monthLabel(month, locale)}</h2>
    {captainWorkspaceEnabled() ? <IconButton className="min-h-12 min-w-12" aria-label={t('next')} disabled={!canGoNext(month, now)}
      onClick={() => onChange(nextMonth(month))}><ChevronRight aria-hidden className="size-5 rtl:rotate-180" /></IconButton> : <Button variant="ghost" className="min-h-12 min-w-12" aria-label={t('next')} disabled={!canGoNext(month, now)}
      onClick={() => onChange(nextMonth(month))}><ChevronRight aria-hidden className="size-5 rtl:rotate-180" /></Button>}
  </div>;
}
