import { describe, expect, it } from 'vitest';
import { bodyPaths, definitionLines, silhouette } from './body-paths';

describe('body geometry', () => {
  it('provides every visible region and excludes chest from the back', () => {
    for (const region of ['chest', 'back', 'shoulders', 'arms', 'abs', 'legs'] as const) {
      expect(bodyPaths.front[region].length).toBeGreaterThan(0);
    }
    for (const region of ['back', 'shoulders', 'arms', 'legs'] as const) {
      expect(bodyPaths.back[region].length).toBeGreaterThan(0);
    }
    expect(bodyPaths.back.chest).toEqual([]);
    expect(bodyPaths.back.abs).toEqual([]);
  });

  it('contains non-empty SVG path data for muscles, definition and silhouette', () => {
    const paths = [silhouette, ...Object.values(definitionLines).flat(),
      ...Object.values(bodyPaths).flatMap(view => Object.values(view).flat())];
    for (const path of paths) {
      expect(path).toMatch(/^M[\d\s,MLHVCSQTAZmlhvcsqtaz.e+\-]+$/);
    }
  });
});
