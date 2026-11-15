export function waterTargetMl(litres: string): number | null {
  if (!litres.trim() || !Number.isFinite(Number(litres))) return null;
  return Math.max(500, Math.min(10000, Math.round(Number(litres) * 4) * 250));
}
