import { describe, expect, it } from 'vitest';
import { guideSpot } from './guide-spot';

const view = { width: 1900, height: 1050 };
const hits = (a: { x: number; y: number; width: number; height: number }, [x, y]: [number, number], w: number, h: number) =>
  x < a.x + a.width && a.x < x + w && y < a.y + a.height && a.y < y + h;

describe('guideSpot', () => {
  it('never covers the phone or the highlighted control when a free side exists', () => {
    const phone = { x: 236, y: 100, width: 342, height: 620 };
    const composer = { x: 661, y: 600, width: 460, height: 90 };
    const spot = guideSpot(composer, phone, 360, 340, view);
    expect(hits(phone, spot, 360, 340)).toBe(false);
    expect(hits(composer, spot, 360, 340)).toBe(false);
  });

  it('centres the guide when there is no target', () => {
    expect(guideSpot(undefined, undefined, 360, 300, view)).toEqual([770, 375]);
  });

  it('stays inside the viewport', () => {
    const [x, y] = guideSpot({ x: 1800, y: 1000, width: 80, height: 40 }, undefined, 360, 300, view);
    expect(x).toBeGreaterThanOrEqual(16);
    expect(x + 360).toBeLessThanOrEqual(view.width - 16);
    expect(y + 300).toBeLessThanOrEqual(view.height - 16);
  });
});
