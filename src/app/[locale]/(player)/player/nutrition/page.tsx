import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { nutritionMessages } from '@/features/nutrition';
import { NutritionScreen } from '@/features/nutrition';

export default function NutritionPage() {
  return <NutritionScreen />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(nutritionMessages, parseLocale((await params).locale));
  return { title: t('pageTitle') };
}
