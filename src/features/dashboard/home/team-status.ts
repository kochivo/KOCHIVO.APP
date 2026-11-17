export function teamStatus(adherence: number): 'teamLow' | 'teamMid' | 'teamHigh' {
  if (adherence < 50) return 'teamLow';
  return adherence < 80 ? 'teamMid' : 'teamHigh';
}
