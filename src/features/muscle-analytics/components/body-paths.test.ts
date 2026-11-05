import { describe, expect, it } from 'vitest';
import { bodyPaths, definitionLines, silhouette } from './body-paths';
import { muscles } from '../analytics/muscle-map';

const legMuscles = ['quads', 'adductors', 'abductors', 'glutes', 'hamstrings', 'calves'] as const;

type Point = [number, number];

function outline(path: string): Point[] {
  const points: Point[] = [];
  for (const command of path.match(/[MLQZ][^MLQZ]*/g) ?? []) {
    const values = command.slice(1).trim().split(/\s+/).map(Number);
    if (command[0] === 'M' || command[0] === 'L') points.push([values[0] ?? 0, values[1] ?? 0]);
    if (command[0] === 'Q') {
      const [x, y] = points.at(-1) ?? [0, 0];
      const [cx = 0, cy = 0, ex = 0, ey = 0] = values;
      for (let step = 1; step <= 40; step++) {
        const t = step / 40;
        points.push([(1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t ** 2 * ex,
          (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t ** 2 * ey]);
      }
    }
  }
  return points;
}

function contains(points: Point[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i] ?? [0, 0];
    const [bx, by] = points[(i + 1) % points.length] ?? [0, 0];
    if ((ay > y) !== (by > y) && x < (bx - ax) * (y - ay) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

describe('body geometry', () => {
  it.each([
    ['front', 220, 50, 76, 23], ['back', 215, 49, 77, 24],
    ['front', 275, 50, 74, 21], ['back', 275, 50, 74, 21],
  ] as const)('fills the %s leg across its section at y=%i', (view, y, start, end, minimum) => {
    const shapes = legMuscles.flatMap(muscle => bodyPaths[view][muscle] ?? []).map(outline);
    const filled = Array.from({ length: end - start + 1 }, (_, i) => start + i)
      .filter(x => shapes.some(shape => contains(shape, x, y)));
    expect(filled.length).toBeGreaterThanOrEqual(minimum);
  });

  it('keeps the knees neutral and every leg shape mirrored with integer coordinates', () => {
    for (const view of ['front', 'back'] as const) {
      const paths = legMuscles.flatMap(muscle => bodyPaths[view][muscle] ?? []);
      expect(paths.map(outline).some(shape => contains(shape, 64, 251))).toBe(false);
      for (let i = 0; i < paths.length; i += 2) {
        let coordinate = 0;
        const mirrored = paths[i]?.replace(/-?\d+/g, value =>
          String(coordinate++ % 2 === 0 ? 160 - Number(value) : Number(value)));
        expect(paths[i + 1]).toBe(mirrored);
        expect(paths[i]).not.toContain('.');
      }
    }
  });

  it('keeps the widened leg silhouette symmetric', () => {
    const shape = outline(silhouette);
    for (const y of [190, 208, 270, 280, 290]) {
      for (let x = 44; x < 80; x++) {
        expect(contains(shape, x + .37, y + .41)).toBe(contains(shape, 160 - x - .37, y + .41));
      }
    }
  });

  it('provides every muscle and excludes chest and core from the back', () => {
    for (const muscle of muscles) {
      expect([...(bodyPaths.front[muscle] ?? []), ...(bodyPaths.back[muscle] ?? [])].length).toBeGreaterThan(0);
    }
    expect(bodyPaths.back.chest ?? []).toEqual([]);
    expect(bodyPaths.back.core ?? []).toEqual([]);
  });

  it('contains non-empty SVG path data for muscles, definition and silhouette', () => {
    const paths = [silhouette, ...Object.values(definitionLines).flat(),
      ...Object.values(bodyPaths).flatMap(view => Object.values(view).flat())];
    for (const path of paths) {
      expect(path).toMatch(/^M[\d\s,MLHVCSQTAZmlhvcsqtaz.e+\-]+$/);
      expect(path.replace(/[MLQZ]|\s|\d/g, '')).toBe('');
      for (const command of path.match(/[MLQZ][^MLQZ]*/g) ?? []) {
        const values = command.slice(1).trim().split(/\s+/).filter(Boolean).map(Number);
        expect(values).toHaveLength(command[0] === 'Z' ? 0 : command[0] === 'Q' ? 4 : 2);
      }
      for (const [x, y] of outline(path)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(160);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(350);
      }
    }
  });
});
