import { expect, it, vi } from 'vitest';
import { readingProgress, showStory, attachLandingMotion, adjustPreviewWeight } from './data/landing-motion';

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
  const doc = { body: { dataset }, addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null, querySelectorAll: (selector: string) => { selectors.push(selector); return []; } } as unknown as Document;
  const cleanup = attachLandingMotion(doc, win, true);
  expect(dataset).toEqual({});
  expect(listeners).toEqual(['resize']);
  expect(selectors).not.toContain('[data-tick], [data-toast], [data-slash]');
  expect(selectors).not.toContain('[data-count]');
  cleanup();
});

it('adjusts sample weights in 2.5 kg steps and never goes below zero', () => {
  expect(adjustPreviewWeight(65, 2.5)).toBe(67.5);
  expect(adjustPreviewWeight(65, -2.5)).toBe(62.5);
  expect(adjustPreviewWeight(0, -2.5)).toBe(0);
});

it('pauses pointer and parallax work off screen or hidden, and observes the final slogan once', () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  const styles = new Map<string, string>();
  const windowListeners = new Map<string, EventListener>();
  const heroListeners = new Map<string, EventListener>();
  const dataset: Record<string, string> = { motionRunning: 'false' };
  const final = { dataset: {} as Record<string, string> };
  let notify: IntersectionObserverCallback | undefined;
  const disconnect = vi.fn();
  const observe = vi.fn();
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) { notify = callback; }
    observe = observe;
    disconnect = disconnect;
  });
  const hero = {
    dataset,
    style: { setProperty: (key: string, value: string) => styles.set(key, value), removeProperty: (key: string) => styles.delete(key) },
    setAttribute: () => {}, querySelector: () => null,
    addEventListener: (key: string, listener: EventListener) => heroListeners.set(key, listener),
    removeEventListener: (key: string) => heroListeners.delete(key),
    getBoundingClientRect: () => ({ left: 10, top: 20 }),
  };
  let frameId = 0;
  const win = {
    scrollY: 200,
    requestAnimationFrame: (callback: FrameRequestCallback) => { callbacks.set(++frameId, callback); return frameId; },
    cancelAnimationFrame: (id: number) => callbacks.delete(id),
    addEventListener: (key: string, listener: EventListener) => windowListeners.set(key, listener),
    removeEventListener: (key: string) => windowListeners.delete(key),
  } as unknown as Window;
  const doc = {
    hidden: false, body: { dataset: {} }, addEventListener: () => {}, removeEventListener: () => {},
    querySelector: (selector: string) => selector === '[data-hero]' ? hero : final,
    querySelectorAll: () => [],
  } as unknown as Document;
  const flush = () => { const pending = [...callbacks.values()]; callbacks.clear(); pending.forEach(callback => callback(0)); };
  try {
    const cleanup = attachLandingMotion(doc, win, false);
    const pointer = { clientX: 100, clientY: 200 } as unknown as Event;
    heroListeners.get('pointermove')?.(pointer);
    windowListeners.get('scroll')?.({} as Event);
    expect(callbacks.size).toBe(0);
    dataset.motionRunning = 'true';
    heroListeners.get('pointermove')?.(pointer);
    expect(callbacks.size).toBe(1);
    Object.defineProperty(doc, 'hidden', { value: true, configurable: true });
    flush();
    expect(styles.size).toBe(0);
    Object.defineProperty(doc, 'hidden', { value: false });
    heroListeners.get('pointermove')?.(pointer);
    windowListeners.get('scroll')?.({} as Event);
    flush();
    expect(styles.get('--mx')).toBe('90px');
    expect(styles.get('--my')).toBe('180px');
    expect(styles.get('--py')).toBe('36px');
    for (const [scrollY, offset] of [[0, '0px'], [500, '90px'], [900, '162px'], [1200, '162px']] as const) {
      Object.defineProperty(win, 'scrollY', { value: scrollY });
      windowListeners.get('scroll')?.({} as Event);
      flush();
      expect(styles.get('--py')).toBe(offset);
    }
    expect(observe).toHaveBeenCalledWith(final);
    notify?.([{ isIntersecting: false }] as IntersectionObserverEntry[], {} as IntersectionObserver);
    expect(final.dataset.enter).toBeUndefined();
    notify?.([{ isIntersecting: true }] as IntersectionObserverEntry[], {} as IntersectionObserver);
    expect(final.dataset.enter).toBe('');
    expect(disconnect).toHaveBeenCalledOnce();
    heroListeners.get('pointermove')?.(pointer);
    cleanup();
    expect(callbacks.size).toBe(0);
    expect(styles.size).toBe(0);
    expect(windowListeners.size).toBe(0);
    expect(heroListeners.size).toBe(0);
  } finally { vi.unstubAllGlobals(); }
});
