export function oldestAssessment<T extends { sent_at: string; answered_at: string | null }>(rows: readonly T[]) {
  return rows.filter(row => row.answered_at === null)
    .sort((a, b) => Date.parse(a.sent_at) - Date.parse(b.sent_at))[0];
}
