import { createT, parseLocale } from '@/core/i18n';
import { mealPlanMessages } from '@/features/meal-plans';
import { PlayerPlans } from '@/features/meal-plans';

export default async function Page({ params }: { params: Promise<{ playerId: string; locale: string }> }) {
  const { playerId } = await params;
  return <PlayerPlans playerId={playerId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(mealPlanMessages, parseLocale(locale));
  return { title: t('mealPlans') };
}
