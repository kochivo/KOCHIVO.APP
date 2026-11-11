import { createT, parseLocale } from '@/core/i18n';
import { mealPlanMessages } from '@/features/meal-plans';
import { NutritionWorkspaceEntry, PlayerPlans } from '@/features/meal-plans';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export default async function Page({ params, searchParams }: {
  params: Promise<{ playerId: string; locale: string }>;
  searchParams?: Promise<{ view?: string | string[] }>;
}) {
  const { playerId, locale } = await params;
  if (captainWorkspaceEnabled()) {
    const query = await searchParams;
    return <NutritionWorkspaceEntry playerId={playerId} locale={parseLocale(locale)} view={query?.view === 'calc' ? 'calc' : 'plan'} />;
  }
  return <PlayerPlans playerId={playerId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(mealPlanMessages, parseLocale(locale));
  return { title: t('mealPlans') };
}
