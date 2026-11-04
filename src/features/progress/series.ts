import type { TrendPoint } from './trends';

export function scaleSeries(points: readonly TrendPoint[], weeks: readonly string[], rtl: boolean) {
  const min = Math.min(...points.map(point => point.value));
  const max = Math.max(...points.map(point => point.value));
  return [...points].sort((a, b) => a.date.localeCompare(b.date)).map(point => {
    const index = weeks.indexOf(point.date);
    const offset = weeks.length < 2 ? 140 : index * 280 / (weeks.length - 1);
    return { ...point, x: rtl ? 315 - offset : 35 + offset,
      y: max === min ? 70 : 115 - (point.value - min) / (max - min) * 90 };
  });
}
