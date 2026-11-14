import { notFound } from 'next/navigation';
import { FoodFormEntry } from '@/features/meal-plans';
import { loadFoodForCopy } from '@/features/meal-plans/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function NewFoodPage({ searchParams }: {
  searchParams: Promise<{ copyFrom?: string; returnTo?: string }>;
}) {
  if (!captainWorkspaceEnabled()) notFound();
  const { copyFrom, returnTo } = await searchParams;
  const result = copyFrom ? await loadFoodForCopy(copyFrom) : undefined;
  return <FoodFormEntry result={result} copyFrom={copyFrom} returnTo={returnTo} />;
}
