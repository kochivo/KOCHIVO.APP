export const limits = {
  entry: { playerMessages: 5, photos: 1, captainMessages: 20, credits: 10, calls: 1500 },
  champion: { playerMessages: 10, photos: 2, captainMessages: 40, credits: 100, calls: 6000 },
  legend: { playerMessages: 10, photos: 2, captainMessages: 40, credits: 250, calls: 10000 },
  empire: { playerMessages: 10, photos: 2, captainMessages: 40, credits: 750, calls: 25000 },
} as const;

export type KoTier = keyof typeof limits;

export function isBigAction(kind: string): boolean {
  return ['create_training', 'create_nutrition', 'training', 'nutrition'].includes(kind);
}
