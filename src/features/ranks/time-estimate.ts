export function timeEstimate(needed: number, weekly = 24) {
  const weeks = needed / (weekly > 0 ? weekly : 24);
  if (weeks < 1) return { key: 'lessWeek', n: 0 } as const;
  if (Math.round(weeks) === 1) return { key: 'oneWeek', n: 1 } as const;
  if (weeks <= 4) return { key: 'weeks', n: Math.round(weeks) } as const;
  return { key: 'months', n: Math.round(weeks / 4) } as const;
}
