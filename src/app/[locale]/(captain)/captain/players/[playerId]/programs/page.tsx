import { createT, parseLocale } from '@/core/i18n';
import { programMessages } from '@/features/programs';
import { ProgramBuilder } from '@/features/programs';

export default async function PlayerProgramsPage({ params }: { params: Promise<{ playerId: string; locale: string }> }) {
  const { playerId } = await params;
  return <ProgramBuilder key={playerId} playerId={playerId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(programMessages, parseLocale(locale));
  return { title: t('programs') };
}
