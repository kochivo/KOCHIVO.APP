import { expect, it } from 'vitest';
import { readingProgress, showStory, attachLandingMotion } from './data/landing-motion';

it('clamps progress and handles pages shorter than the viewport', () => {
  expect(readingProgress(50, 200, 100)).toBe(.5);
  expect(readingProgress(500, 200, 100)).toBe(1);
  expect(readingProgress(-50, 200, 100)).toBe(0);
  expect(readingProgress(0, 50, 100)).toBe(0);
});

it('switches all four story screens and rail markers together', () => {
  const screens = Array.from({ length: 4 }, (_, i) => ({ dataset: { screen: String(i) }, hidden: false }));
  const markers = Array.from({ length: 4 }, (_, i) => ({ dataset: { step: String(i), active: '' } }));
  const root = { querySelectorAll: (selector: string) => selector === '[data-screen]' ? screens : markers } as unknown as ParentNode;
  for (let i = 0; i < 4; i++) {
    showStory(root, String(i));
    expect(screens.map(screen => screen.hidden)).toEqual(screens.map((_, n) => n !== i));
    expect(markers.map(marker => marker.dataset.active)).toEqual(markers.map((_, n) => String(n === i)));
  }
});

it('applies no motion attributes or pointer listeners for reduced motion', () => {
  const dataset: Record<string, string> = {};
  const callbacks: FrameRequestCallback[] = [];
  const listeners: string[] = [];
  const win = {
    requestAnimationFrame: (fn: FrameRequestCallback) => { callbacks.push(fn); return callbacks.length; },
    cancelAnimationFrame: () => {},
    addEventListener: (type: string) => listeners.push(type), removeEventListener: () => {},
  } as unknown as Window;
  const selectors: string[] = [];
  const doc = { body: { dataset }, querySelector: () => null, querySelectorAll: (selector: string) => { selectors.push(selector); return []; } } as unknown as Document;
  const cleanup = attachLandingMotion(doc, win, true);
  expect(dataset).toEqual({});
  expect(listeners).toEqual(['scroll', 'resize']);
  expect(selectors).not.toContain('[data-tick], [data-toast], [data-slash]');
  expect(selectors).not.toContain('[data-count]');
  cleanup();
});
