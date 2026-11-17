import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { StatStrip } from '@/ui/stat-strip';
import type { LibraryFood } from '../../data/library-types';
import { messages } from './v2/messages';

export function LibraryStats({ foods, onSelect }: { foods: LibraryFood[]; onSelect: (food: LibraryFood) => void }) {
  const t = useT(messages), locale = useLocale();
  const recent = foods.filter(food => food.custom).slice()
    .sort((a, b) => (b.addedAt ?? b.id).localeCompare(a.addedAt ?? a.id)).slice(0, 3);
  return <div className="grid gap-card-gap">
    <StatStrip className="max-sm:[&>div:last-child]:col-span-2" items={(['all', 'eg', 'arabic', 'intl', 'mine'] as const).map(key => {
      const count = foods.filter(food => key === 'all' || (key === 'mine' ? food.custom
        : key === 'arabic' ? ['gulf', 'lev', 'na'].includes(food.region ?? '') : (food.region ?? 'intl') === key)).length;
      return { label: t(key), value: count };
    })} />
    <div className="glass grid content-start gap-inline rounded-card p-card">
      <p className="text-xs text-muted">{t('recent')}</p>
      {recent.map(food => <Button key={food.id} variant="secondary" onClick={() => onSelect(food)}>{locale === 'en' ? food.nameEn || food.name : food.name}</Button>)}
      {!recent.length && <p className="text-xs text-muted">{t('noRecent')}</p>}
    </div>
  </div>;
}
