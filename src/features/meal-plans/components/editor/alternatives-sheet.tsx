'use client';
import { useId } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';
import { uuidv7 } from '@/core/offline/ids';
import type { MealItem, PlanDraft } from '../../types';
import { addAlternative, removeAlternative } from '../../draft';
import { V11FoodPicker } from '../v11-food-picker';
import { messages } from '../../messages';

export function AlternativesSheet({ item, update, onClose, openerId }: { item: MealItem; update: (change: (draft: PlanDraft) => PlanDraft) => void; onClose: () => void; openerId: string }) {
  const t = useT(messages), titleId = useId();
  return <ResponsiveDialog modal openerId={openerId} fallbackId={openerId} onDismiss={onClose} aria-labelledby={titleId} className="sheet fixed inset-0 z-50 m-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-card border border-line p-card">
    <header className="flex items-center justify-between gap-inline"><h2 id={titleId} className="text-title">{t('alternatives')}</h2><IconButton aria-label={t('close')} onClick={onClose}><X aria-hidden /></IconButton></header>
    <div className="min-h-0 overflow-y-auto py-page-y"><ul>{!item.alternatives.length && <li className="py-stack text-muted">{t('noAlternativesYet')}</li>}{item.alternatives.map(alt => <li key={alt.id} className="flex items-center justify-between gap-inline border-b border-line py-inline"><span>{alt.food.name} · {t('g', { v0: alt.grams })}</span><IconButton aria-label={t('deleteAlternative', { v0: alt.food.name })} onClick={() => update(draft => removeAlternative(draft, item.id, alt.id))}><X aria-hidden /></IconButton></li>)}</ul>
      <V11FoodPicker inline alternative disabled={false} onPick={food => update(draft => addAlternative(draft, item.id, food, uuidv7()))} />
    </div><footer className="sticky bottom-0 pt-stack"><Button onClick={onClose}>{t('close')}</Button></footer>
  </ResponsiveDialog>;
}
