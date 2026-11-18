export function timeEstimate(needed: number, weekly?: number) {
  if (weekly === undefined || weekly <= 0) return null;
  const weeks = needed / weekly;
  if (weeks < 1) return { key: 'lessWeek', n: 0 } as const;
  if (Math.round(weeks) === 1) return { key: 'oneWeek', n: 1 } as const;
  if (weeks <= 4) return { key: 'weeks', n: Math.round(weeks) } as const;
  return { key: 'months', n: Math.round(weeks / 4) } as const;
}
