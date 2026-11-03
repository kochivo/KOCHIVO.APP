import { createT, parseLocale } from '@/core/i18n';
import { mealPlanMessages } from '@/features/meal-plans';
import { PlanBuilder } from '@/features/meal-plans';

export default async function Page({ params }: { params: Promise<{ planId: string; locale: string }> }) {
  const { planId } = await params;
  return <PlanBuilder planId={planId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(mealPlanMessages, parseLocale(locale));
  return { title: t('mealPlans') };
}
