import { expect, it } from 'vitest';
import { rangePoints, weightChange } from './components/progress-v3-model';

const points = [{ date: '2026-08-20', value: 80 }, { date: '2026-10-20', value: 82 }, { date: '2026-11-13', value: 81.2 }];
it('filters both month and three-month ranges against the injected day', () => {
  expect(rangePoints(points, '2026-11-13', 1)).toEqual(points.slice(1));
  expect(rangePoints(points, '2026-11-13', 3)).toEqual(points);
  expect(rangePoints([...points, { date: '2026-12-01', value: 90 }], '2026-11-13', 1)).toEqual(points.slice(1));
});
it('reports the direction and rounded amount of weight changes', () => {
  expect(weightChange(points.slice(1))).toEqual({ direction: 'down', amount: 0.8 });
  expect(weightChange(points)).toEqual({ direction: 'up', amount: 1.2 });
  expect(weightChange([])).toBeNull();
  expect(weightChange(points.slice(0, 1))).toBeNull();
  expect(weightChange([{ date: '2026-11-01', value: 80 }, { date: '2026-11-13', value: 80 }])).toBeNull();
});
