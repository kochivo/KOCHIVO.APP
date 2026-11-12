export function weightSummary(current: number, initial: number | null, target: number | null) {
  return { change: initial === null ? null : Math.round((current - initial) * 10) / 10,
    remaining: target === null ? null : Math.round(Math.abs(current - target) * 10) / 10 };
}
