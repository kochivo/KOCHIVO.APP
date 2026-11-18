import { Pencil, Trophy } from 'lucide-react';
import { useArabicStyle } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { Button } from '@/ui/button';
import { workspaceMessages } from './workspace/messages';

export function WorkspacePrizeCard({ locale, title, prize, current, onEdit, disabled }: {
  locale: Locale; title: string; prize: string | null; current?: boolean;
  onEdit?: () => void; disabled?: boolean;
}) {
  const t = createT(workspaceMessages, locale, useArabicStyle());
  return <div className="flex items-center gap-inline">
    {current && <span className="tone-warn cut-corner-sm grid size-10 shrink-0 place-items-center">
      <Trophy aria-hidden className="size-4" />
    </span>}
    <div className="min-w-0 flex-1">
      <h2 className={current ? 'text-xs text-muted' : 'text-sm font-bold'}>{title}</h2>
      <p className={current && prize ? 'break-words text-md font-bold' : 'break-words text-xs text-muted'}>{prize ?? t('unset')}</p>
    </div>
    {onEdit && <Button variant="secondary" className="shrink-0 whitespace-nowrap px-stack text-row"
      onClick={onEdit} disabled={disabled}>
      {current && <Pencil aria-hidden className="size-4" />}
      {t(current || prize ? 'edit' : 'set')}
    </Button>}
  </div>;
}
