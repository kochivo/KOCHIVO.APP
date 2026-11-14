import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

export function Podium({ rows, locale }: { rows: LeaderboardRow[]; locale: Locale }) {
  const t = createT(messages, locale);
  const places = [1, 0, 2].flatMap(index => rows[index] ? [{ row: rows[index], place: index + 1 }] : []);
  if (!places.length) return null;
  return <section className="glass rounded-card p-[18px]" aria-label={t('workspaceTitle')}>
    <ol className="flex items-end justify-center gap-2.5 pt-2.5">
      {places.map(({ row, place }) => <li key={row.player_id ?? place}
        className={`glass-strong flex min-w-0 max-w-[130px] flex-1 flex-col items-center justify-end gap-1 rounded-t-[14px] rounded-b px-1.5 py-2.5 ${
          place === 1 ? 'h-[150px] border border-gold-2/40 text-gold-2' : place === 2 ? 'h-[120px]' : 'h-[100px]'}`}>
        <span aria-hidden className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-line bg-surface text-sm font-bold">
          {row.display_name.trim().slice(0, 1)}
        </span>
        <small className="max-w-full truncate text-ink">{row.display_name.trim().split(/\s+/)[0]}</small>
        <b className="font-display text-lg font-extrabold tabular-nums">{formatNumber(place, locale)}</b>
      </li>)}
    </ol>
  </section>;
}
