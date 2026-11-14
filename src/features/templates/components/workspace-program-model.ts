export type ProgramTab = 'mine' | 'ready' | 'assigned';
type Program = { starter: boolean; uses: number; archived?: boolean };

export function filterPrograms<T extends Program>(rows: T[], tab: ProgramTab): T[] {
  return rows.filter(row => !row.archived && (tab === 'assigned' ? row.uses > 0 : tab === 'ready' ? row.starter : !row.starter));
}

export function programWeek(days: { weekday?: number | null; is_rest_day?: boolean }[]) {
  return Array.from({ length: 7 }, (_, weekday) => days.some(day => day.weekday === weekday && !day.is_rest_day));
}
