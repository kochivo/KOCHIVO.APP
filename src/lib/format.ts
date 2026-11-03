/** Keep grouping and Latin digits consistent across the Arabic UI. */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}
