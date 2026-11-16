import { useT } from '@/core/i18n/client';
import type { Food } from '../../types';
import { foodStatus } from './library-model';
import { messages } from './v2/messages';

export function FoodBadge({ food }: { food: Food }) {
  const t = useT(messages);
  return <span className="inline-flex rounded-full border border-line px-inline py-inline text-micro text-muted">{t(foodStatus(food))}</span>;
}
