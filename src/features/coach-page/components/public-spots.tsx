import type { Translator } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { spotsLabel } from '../public-sections';
import type { messages } from '../sections/messages';

export function PublicSpots({ spots, accepting, t }: { spots: number; accepting: boolean; t: Translator<typeof messages> }) {
  const label = spotsLabel(spots, accepting);
  if (!label) return null;
  return <p className="flex items-center gap-stack text-sm text-muted">
    <span aria-hidden className="flex gap-inline">{Array.from({ length: 10 }, (_, i) =>
      <i key={i} data-segment className={`h-4 w-1.5 -skew-x-12 ${i < 10 - spots ? 'bg-lime' : 'bg-line'}`} />)}</span>
    <b>{t(label, { n: spots, count: formatNumber(spots) })}</b>
  </p>;
}
