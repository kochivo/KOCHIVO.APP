import type { Translator } from '@/core/i18n/messages';
import type { PublicStats } from '../public-sections';
import { statsCells } from '../public-sections';
import type { messages } from '../sections/messages';
import { PublicCount } from './public-count';

export function PublicNumbers({ stats, years, t }: { stats: PublicStats; years: number | null; t: Translator<typeof messages> }) {
  const cells = statsCells(stats, years);
  if (!cells.length) return null;
  return <section className="glass-strong rounded-card px-page-x py-page-y">
    <dl className="flex flex-wrap justify-around gap-section">{cells.map(cell => <div key={cell.key} className="text-center">
      <dd className="font-display text-4xl font-extrabold"><PublicCount value={cell.value} unit={cell.unit} /></dd>
      <dt className="mt-inline text-sm text-muted">{t(cell.key)}</dt>
    </div>)}</dl>
    <p className="mt-section text-center text-xs text-muted">{t('honesty')}</p>
  </section>;
}
