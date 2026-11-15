export type MedalCounts = { workouts: number; full_weeks: number; prs: number; crowns: number; crown_streak: number };
export type MedalMetal = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const MEDAL_SETS = [
  { key: 'workouts', emblem: 'flame', steps: [1,10,50,100,250], metals: [0,1,2,3,5] },
  { key: 'full_weeks', emblem: 'calendar', steps: [1,4,12,26,52], metals: [1,2,3,4,6] },
  { key: 'prs', emblem: 'bolt', steps: [1,10,25,50,100], metals: [0,1,2,3,5] },
  { key: 'crowns', emblem: 'crown', steps: [1,3,6,3,12], metals: [3,4,5,5,6] },
] as const;

export function medalProgress(counts: MedalCounts) {
  return MEDAL_SETS.map(set => {
    const steps = set.steps.map((threshold, index) => {
      const streak = set.key === 'crowns' && index === 3;
      const count = streak ? counts.crown_streak : counts[set.key];
      return { id: `${set.key}:${index}`, threshold, metal: set.metals[index] ?? 0, streak,
        earned: count >= threshold, percent: Math.min(100, Math.floor(count / threshold * 100)) };
    });
    const next = steps.find(step => !step.earned);
    return { ...set, steps, earned: steps.filter(step => step.earned), next, percent: next?.percent ?? 100 };
  });
}
export function earnedCount(counts: MedalCounts): number {
  return medalProgress(counts).reduce((sum, set) => sum + set.earned.length, 0);
}
