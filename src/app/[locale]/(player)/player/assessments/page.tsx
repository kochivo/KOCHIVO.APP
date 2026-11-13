import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { AssessmentsScreen, playerPagesMessages } from '@/features/player-shell';

export default function AssessmentsPage() {
  return <AssessmentsScreen />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(playerPagesMessages, parseLocale((await params).locale));
  return { title: t('assessments') };
}
