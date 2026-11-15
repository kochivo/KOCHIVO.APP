import { createT, parseLocale } from '@/core/i18n';
import { mealPlanMessages } from '@/features/meal-plans';
import { PlayerPlans } from '@/features/meal-plans';
import { NutritionWorkspaceEntry } from '@/features/meal-plans/server';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function Page({ params, searchParams }: {
  params: Promise<{ playerId: string; locale: string }>;
  searchParams?: Promise<{ view?: string | string[] }>;
}) {
  const { playerId, locale } = await params;
  if (captainWorkspaceEnabled()) {
    const query = await searchParams;
    const { PlayerFileEntry } = await import('@/features/captain-workspace/server');
    return <PlayerFileEntry playerId={playerId} tab="nutrition">
      <NutritionWorkspaceEntry playerId={playerId} locale={parseLocale(locale)} view={query?.view === 'calc' ? 'calc' : 'plan'} />
    </PlayerFileEntry>;
  }
  return <PlayerPlans playerId={playerId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(mealPlanMessages, parseLocale(locale));
  return { title: t('mealPlans') };
}
