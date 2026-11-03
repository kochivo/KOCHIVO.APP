export type NameConfidence = 'high' | 'medium' | 'low';

export interface ArabicNameProposal {
  dataset_id: string;
  name_ar: string;
  confidence: NameConfidence;
}

interface NamedExercise {
  dataset_id: string;
  name_ar?: string | null;
}

const confidenceRank: Record<NameConfidence, number> = { low: 0, medium: 1, high: 2 };

export function mergeArabicNames<T extends NamedExercise>(
  exercises: readonly T[],
  proposals: readonly ArabicNameProposal[],
  { minConfidence }: { minConfidence: NameConfidence },
): (Omit<T, 'name_ar'> & NamedExercise)[] {
  const accepted = new Map(proposals
    .filter((proposal) => confidenceRank[proposal.confidence] >= confidenceRank[minConfidence])
    .map((proposal) => [proposal.dataset_id, proposal.name_ar]));

  return exercises.map((exercise) => {
    const name = accepted.get(exercise.dataset_id);
    return !exercise.name_ar && name !== undefined
      ? { ...exercise, name_ar: name }
      : { ...exercise };
  });
}
