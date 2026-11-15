export type WaterBaseline = { date: string; water: number };
export function completedCups(target: number, water: number) {
  return Array.from({ length: 8 }, (_, index) => index + 1).filter(cups => Math.round(cups * target / 8) <= water).length;
}
export function nextCupMl(target: number, water: number) {
  const cups = completedCups(target, water);
  return cups < 8 ? Math.round((cups + 1) * target / 8) - Math.round(cups * target / 8) : Math.round(target / 8);
}
export function nightWaterMl(baseline: WaterBaseline, rows: { log_date: string; water_ml: number }[], night: boolean) {
  if (!night) return 0;
  return Math.max(0, rows.reduce((total, row) => total + row.water_ml, 0) - baseline.water);
}
