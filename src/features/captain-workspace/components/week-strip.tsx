import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { daySummary } from '@/features/programs';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { messages } from '../messages';
import type { WeekCell } from '../week-cells';

export function WeekStrip({ cells, selectedId, onSelect, locale }: {
  cells: WeekCell[]; selectedId?: string; onSelect: (id: string) => void; locale: Locale;
}) {
  const t = createT(messages, locale);
  return <nav aria-label={t('days')} className="glass overflow-x-auto rounded-card border border-line">
    <ul className="flex">
      {cells.map(cell => {
        const summary = cell.day && daySummary(cell.day);
        return <li key={cell.id} className="min-w-12 flex-1 lg:min-w-24">
          <button type="button" aria-pressed={cell.id === selectedId} onClick={() => onSelect(cell.id)}
            className={`flex min-h-24 w-full min-w-0 flex-col items-center justify-center gap-1 border-b-2 px-1 py-3 text-center text-xs lg:items-start lg:px-3 ${cell.id === selectedId ? 'glass-strong border-b-lime' : 'border-b-transparent'} ${cell.rest ? 'text-muted' : 'text-ink'}`}>
            <span className="text-muted">{cell.weekday ? t(cell.weekday) : t('day', { count: formatNumber(cell.day?.position ?? 0, locale) })}</span>
            <span className="line-clamp-2 break-words font-bold">{cell.rest ? t('rest') : cell.day?.title ? starterText(cell.day.title, locale) : t('training')}</span>
            {summary && <span className="text-muted">
              <span className="block">{t('sets', { count: formatNumber(summary.sets, locale) })}</span>
              <span className="block">{t('minutes', { count: formatNumber(summary.minutes, locale) })}</span>
            </span>}
          </button>
        </li>;
      })}
    </ul>
  </nav>;
}
