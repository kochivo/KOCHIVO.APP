import type { FactKey, FactValues, Snapshot } from './model';

export interface SnapshotComparison {
  key: FactKey;
  value: FactValues[FactKey];
  previousValue?: FactValues[FactKey];
  delta?: number;
  direction: 'better' | 'worse' | 'same' | 'new';
}

export function compareSnapshots(current: Snapshot, previous?: Snapshot | null): SnapshotComparison[] {
  const target = current.facts.targetWeight ?? previous?.facts.targetWeight;
  const baseline = previous?.facts.weight ?? current.facts.weight;
  const goal = typeof target === 'number' && typeof baseline === 'number' ? Math.sign(target - baseline) : 0;
  return (Object.keys(current.facts) as FactKey[]).flatMap(key => {
    const value = current.facts[key];
    if (value === undefined) return [];
    const previousValue = previous?.facts[key];
    const delta = typeof value === 'number' && typeof previousValue === 'number'
      ? Math.round((value - previousValue) * 1000) / 1000 : undefined;
    let direction: SnapshotComparison['direction'] = previousValue === undefined ? 'new' : 'same';
    if (previous && key === 'injuries' && Array.isArray(value)) {
      const old = new Set<string | number>(Array.isArray(previousValue) ? previousValue : []);
      if (value.some(injury => injury !== 'none' && !old.has(injury))) direction = 'worse';
    }
    if ((key === 'weight' || key === 'waist') && delta !== undefined && delta !== 0 && goal !== 0) {
      direction = Math.sign(delta) === goal ? 'better' : 'worse';
    }
    return [{ key, value, direction, ...(previousValue === undefined ? {} : { previousValue }),
      ...(delta === undefined ? {} : { delta }) }];
  });
}
