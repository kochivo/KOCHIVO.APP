import { ProgramBuilder } from '@/features/programs';

export default async function ProgramPage({ params }: { params: Promise<{ programId: string }> }) {
  const { programId } = await params;
  return <ProgramBuilder key={programId} programId={programId} />;
}
