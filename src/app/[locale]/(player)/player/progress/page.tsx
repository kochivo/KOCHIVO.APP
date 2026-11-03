import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { progressMessages } from '@/features/progress';
import { ProgressScreen } from '@/features/progress';

export default function ProgressPage() {
  return <ProgressScreen />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(progressMessages, parseLocale((await params).locale));
  return { title: t('pageTitle') };
}
