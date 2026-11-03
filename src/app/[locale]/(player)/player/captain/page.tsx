import { parseLocale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { playerHomeMessages } from '@/features/player-home';
import { CaptainScreen } from '@/features/player-shell';
import { PlayerVoiceNotes } from '@/features/voice-notes';

export default function CaptainPage() {
  return <CaptainScreen voiceNotes={<PlayerVoiceNotes />} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getT(playerHomeMessages, parseLocale((await params).locale));
  return { title: t('captainTitle') };
}
