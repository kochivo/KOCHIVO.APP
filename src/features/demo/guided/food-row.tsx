/* eslint-disable no-restricted-imports -- T-288 shares the real nutrition editor's read-only row. */
import { V11FoodRowView } from '@/features/meal-plans/components/v11-food-row-view';
/* eslint-enable no-restricted-imports */
import type { ReactNode } from 'react';
import { Utensils } from 'lucide-react';

export function FoodRow({ name, children }: { name: string; children?: ReactNode }) {
  const title = name.split(' · ')[0] ?? name;
  return <V11FoodRowView name={title} photo={null} detail={name.split(' · ').slice(1).join(' · ')}>
    <span aria-hidden className="demo-food-fallback glass order-first grid size-9 shrink-0 place-items-center rounded-lg text-muted"><Utensils className="size-5" /></span>
    {children}
  </V11FoodRowView>;
}
