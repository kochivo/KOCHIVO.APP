import { createT, parseLocale } from '@/core/i18n';
import { programMessages } from '@/features/programs/server';
import { ProgramBuilder } from '@/features/programs';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { ProgramTrainingEntry } from '@/features/captain-workspace/server';

export default async function ProgramPage({ params }: { params: Promise<{ programId: string; locale: string }> }) {
  const { programId } = await params;
  if (captainWorkspaceEnabled()) return <ProgramTrainingEntry programId={programId} />;
  return <ProgramBuilder key={programId} programId={programId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = createT(programMessages, parseLocale(locale));
  return { title: t('programBuilder') };
}
