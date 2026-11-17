import { describe, expect, it } from 'vitest';
import { guideSpot } from './guide-spot';

const view = { width: 1900, height: 1050 };
const hits = (a: { x: number; y: number; width: number; height: number }, [x, y]: [number, number], w: number, h: number) =>
  x < a.x + a.width && a.x < x + w && y < a.y + a.height && a.y < y + h;

describe('guideSpot', () => {
  it('prefers the side with more space even when both sides fit', () => {
    expect(guideSpot({ x: 500, y: 300, width: 200, height: 100 }, undefined, 360, 300, view)[0]).toBe(716);
  });

  it('prefers the left side for a target nearer the right edge', () => {
    expect(guideSpot({ x: 1200, y: 300, width: 200, height: 100 }, undefined, 360, 300, view)[0]).toBe(824);
  });

  it('keeps a tall guide inside a short viewport', () => {
    const [, y] = guideSpot({ x: 600, y: 120, width: 200, height: 60 }, undefined, 360, 450, { width: 1366, height: 520 });
    expect(y).toBeGreaterThanOrEqual(16);
    expect(y + 450).toBeLessThanOrEqual(504);
  });

  it('uses the other side when the phone occupies the roomier side', () => {
    const target = { x: 500, y: 300, width: 200, height: 100 };
    const phone = { x: 716, y: 100, width: 342, height: 620 };
    const spot = guideSpot(target, phone, 360, 300, view);
    expect(spot[0]).toBe(124);
    expect(hits(phone, spot, 360, 300)).toBe(false);
    expect(hits(target, spot, 360, 300)).toBe(false);
  });

  it('places the guide below a wide target when neither horizontal side fits', () => {
    const target = { x: 16, y: 120, width: 1334, height: 100 };
    const viewport = { width: 1366, height: 850 };
    const spot = guideSpot(target, undefined, 360, 300, viewport);
    expect(spot[1]).toBe(236);
    expect(hits(target, spot, 360, 300)).toBe(false);
  });
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
