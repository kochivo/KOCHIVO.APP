type Member = { id: string; superset_group: number | null };
export function supersetLabel(rows: readonly Member[], row: Member): string | null {
  if (row.superset_group === null) return null;
  const groups = [...new Set(rows.flatMap(item => item.superset_group === null ? [] : [item.superset_group]))];
  return String.fromCharCode(65 + groups.indexOf(row.superset_group));
}
export function supersetTag(rows: readonly Member[], row: Member): string | null {
  const letter = supersetLabel(rows, row);
  return letter && `${letter}${rows.filter(item => item.superset_group === row.superset_group).findIndex(item => item.id === row.id) + 1}`;
}
export function exerciseGroups<T extends Member>(rows: readonly T[]): T[][] {
  const seen = new Set<number>();
  return rows.flatMap(row => {
    if (row.superset_group === null) return [[row]];
    if (seen.has(row.superset_group)) return [];
    seen.add(row.superset_group);
    return [rows.filter(item => item.superset_group === row.superset_group)];
  });
}
