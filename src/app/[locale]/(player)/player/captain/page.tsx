import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { playerHomeMessages } from '@/features/player-home';
import { CaptainScreen } from '@/features/player-shell';

export default function CaptainPage() {
  return <CaptainScreen />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(playerHomeMessages, parseLocale((await params).locale));
  return { title: t('captainTitle') };
}
