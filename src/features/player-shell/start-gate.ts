export function needsStartGate(rows: { blocks_access: boolean; answered_at: string | null }[]) {
  return rows.some(row => row.blocks_access && !row.answered_at);
}
export function gateApplies(pathname: string) {
  return !/\/player\/(settings|captain|chat|forms|assessments)(?:\/|$)/.test(pathname);
}
