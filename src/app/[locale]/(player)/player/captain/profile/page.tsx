import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { CaptainProfileScreen, playerPagesMessages } from '@/features/player-shell';

export default function CaptainProfilePage() {
  return <CaptainProfileScreen />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(playerPagesMessages, parseLocale((await params).locale));
  return { title: t('profileTitle') };
}
