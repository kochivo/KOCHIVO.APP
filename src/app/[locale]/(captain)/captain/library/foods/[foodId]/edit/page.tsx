import { notFound } from 'next/navigation';
import { FoodFormEntry } from '@/features/meal-plans';
import { loadFoodForEdit } from '@/features/meal-plans/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function EditFoodPage({ params, searchParams }: {
  params: Promise<{ foodId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  if (!captainWorkspaceEnabled()) notFound();
  const { foodId } = await params;
  const { returnTo } = await searchParams;
  return <FoodFormEntry result={await loadFoodForEdit(foodId)} returnTo={returnTo} />;
}
