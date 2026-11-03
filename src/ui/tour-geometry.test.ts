import { afterEach, expect, it, vi } from 'vitest';
import { tourGeometry, visibleTarget } from './tour/geometry';

afterEach(() => vi.unstubAllGlobals());

it('finds the visible copy of a responsive target and ignores missing or hidden targets', () => {
  const target = (id: string, rects: number, hidden = false, opacity = '1') => ({
    dataset: { tour: id }, closest: () => hidden ? {} : null,
    getClientRects: () => Array.from({ length: rects }), opacity,
  });
  const visible = target('inbox', 1);
  vi.stubGlobal('document', { querySelectorAll: () => [target('inbox', 0), target('hidden', 1, true), target('transparent', 1, false, '0'), visible] });
  vi.stubGlobal('getComputedStyle', (element: { opacity: string }) => ({ display: 'block', visibility: 'visible', opacity: element.opacity }));
  expect(visibleTarget('inbox')).toBe(visible);
  expect(visibleTarget('missing')).toBeUndefined();
  expect(visibleTarget('hidden')).toBeUndefined();
  expect(visibleTarget('transparent')).toBeUndefined();
});

it.each([false, true])('keeps the spotlight aligned and card in the viewport, rtl=%s', rtl => {
  const rect = { left: 900, right: 1000, top: 740, width: 100, height: 48 } as DOMRect;
  const layout = tourGeometry(rect, 1024, 800, rtl);
  expect(layout.ring.insetInlineStart).toBe(rtl ? 20 : 896);
  expect(layout.ring.width).toBe(108);
  expect(layout.cardStart).toBeGreaterThanOrEqual(16);
  expect(layout.cardStart + 352).toBeLessThanOrEqual(1008);
  expect(layout.cardTop + 300).toBeLessThanOrEqual(784);
  // Phone navigation stays below the bottom-docked card, with space for its ring.
  expect(800 - layout.cardBottom).toBeLessThan(rect.top - 4);
});
