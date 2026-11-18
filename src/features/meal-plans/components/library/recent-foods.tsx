import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import type { LibraryFood } from '../../data/library-types';
import { messages } from './v2/messages';

export function RecentFoods({ foods, onSelect }: { foods: LibraryFood[]; onSelect: (food: LibraryFood) => void }) {
  const t = useT(messages), locale = useLocale();
  const recent = foods.filter(food => food.custom).slice()
    .sort((a, b) => (b.addedAt ?? b.id).localeCompare(a.addedAt ?? a.id)).slice(0, 3);
  return <div className="flex flex-wrap items-center gap-inline">
    <p className="text-xs text-muted">{t('recent')}</p>
    {recent.map(food => <Button key={food.id} variant="secondary" onClick={() => onSelect(food)}>{locale === 'en' ? food.nameEn || food.name : food.name}</Button>)}
    {!recent.length && <p className="text-xs text-muted">{t('noRecent')}</p>}
  </div>;
}
