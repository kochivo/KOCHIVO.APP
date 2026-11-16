import type { PainArea } from '@/core/offline/pain-tables';

const legs = ['upper legs', 'lower legs', 'legs', 'waist'];
const arms = ['upper arms', 'lower arms', 'chest', 'back', 'shoulders'];
export const painBlockedParts: Record<PainArea, readonly string[]> = {
  neck: [...arms, 'neck'], shoulder_l: arms, shoulder_r: arms,
  elbow_l: arms, elbow_r: arms, wrist_l: arms, wrist_r: arms,
  upper_back: [...arms, 'waist'], lower_back: [...legs, 'back'], chest: ['chest', 'shoulders', 'upper arms'],
  hip_l: legs, hip_r: legs, knee_l: legs, knee_r: legs, ankle_l: legs, ankle_r: legs, other: [],
};
const knownParts = [...arms, ...legs, 'neck'];
const injuryFor = (area: PainArea) => area.startsWith('knee_') ? 'knee' : area.startsWith('shoulder_') ? 'shoulder' : area === 'lower_back' ? 'lower_back' : null;

export function painAffects(area: PainArea, exercise: { body_part?: string | null; stress?: string[] }): boolean {
  const part = exercise.body_part?.toLowerCase();
  const injury = injuryFor(area);
  return area === 'other' || !part || !knownParts.includes(part) || painBlockedParts[area].includes(part) ||
    Boolean(injury && exercise.stress?.includes(injury));
}

export function safePainSwap<T extends { id: string; body_part?: string | null; pattern?: string; stress?: string[] }>(area: PainArea, rows: readonly T[], pattern?: string,
  reports: readonly { area: PainArea; exercise_id?: string }[] = []): T | undefined {
  if (area === 'other' || !pattern) return undefined;
  return rows.find(row => row.pattern === pattern && row.stress && !painAffects(area, row) &&
    reports.every(report => row.id !== report.exercise_id && safePainSwap(report.area, [row], pattern)));
}

export function painLoad(weight: number, hint: { factor: number; until: string } | undefined, today: string): number {
  return hint && hint.until >= today ? weight * hint.factor : weight;
}
