export function waterGoalMl(weightKg?: number | null): number {
  return weightKg == null || !Number.isFinite(weightKg) || weightKg <= 0 ? 3000 :
    Math.min(4000, Math.max(2000, Math.round(weightKg * 35 / 250) * 250));
}

export function playerWaterGoalMl(planTarget?: number | null, weightKg?: number | null): number {
  return planTarget ?? waterGoalMl(weightKg);
}
