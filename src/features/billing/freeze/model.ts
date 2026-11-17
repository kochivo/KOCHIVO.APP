export function remainingFreezeDays(limit: number | null, approvedDays: number): number {
  return Math.max(0, (limit ?? 0) - approvedDays);
}

export function freezeInput(days: number, note: string, remaining: number) {
  if (!Number.isInteger(days) || days < 1 || days > Math.min(90, remaining) || [...note].length > 200) return null;
  return { days, note: note.trim() || null };
}
