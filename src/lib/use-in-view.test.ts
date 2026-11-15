import { expect, it, vi } from 'vitest';
import { observeBuiltinLoops, observeInView } from './use-in-view';

it('runs only while intersecting and visible, and disconnects on cleanup', () => {
  const doc = new EventTarget() as Document;
  Object.defineProperty(doc, 'hidden', { value: false, writable: true });
  const element = { dataset: {} } as HTMLElement;
  let notify: (visible: boolean) => void = () => {};
  const disconnect = vi.fn();
  const cleanup = observeInView(element, doc, callback => {
    notify = callback;
    return { observe: vi.fn(), disconnect };
  });
  expect(element.dataset.motionRunning).toBe('false');
  notify(true);
  expect(element.dataset.motionRunning).toBe('true');
  Object.defineProperty(doc, 'hidden', { value: true });
  doc.dispatchEvent(new Event('visibilitychange'));
  expect(element.dataset.motionRunning).toBe('false');
  Object.defineProperty(doc, 'hidden', { value: false });
  doc.dispatchEvent(new Event('visibilitychange'));
  expect(element.dataset.motionRunning).toBe('true');
  notify(false);
  expect(element.dataset.motionRunning).toBe('false');
  cleanup();
  expect(disconnect).toHaveBeenCalledOnce();
  expect(element.dataset.motionRunning).toBe('false');
  doc.dispatchEvent(new Event('visibilitychange'));
  expect(element.dataset.motionRunning).toBe('false');
  notify(true);
  expect(element.dataset.motionRunning).toBe('false');
});

it('stays paused if mounted in a hidden tab and observes the actual element', () => {
  const doc = new EventTarget() as Document;
  Object.defineProperty(doc, 'hidden', { value: true });
  const element = { dataset: {} } as HTMLElement;
  const observe = vi.fn();
  const cleanup = observeInView(element, doc, notify => {
    notify(true);
    return { observe, disconnect: vi.fn() };
  });
  expect(observe).toHaveBeenCalledWith(element);
  expect(element.dataset.motionRunning).toBe('false');
  cleanup();
});

it('gates built-in loops in lazy fallbacks and cleans up removed nodes', () => {
  class Loop {
    dataset: DOMStringMap = {};
    isConnected = true;
    looping = true;
    matches() { return this.looping; }
    querySelectorAll() { return []; }
  }
  const first = new Loop(), added = new Loop();
  const doc = Object.assign(new EventTarget(), { hidden: false, body: {}, querySelectorAll: () => [first] });
  const notifications: ((visible: boolean) => void)[] = [];
  const disconnect = vi.fn();
  let mutate: (records: MutationRecord[]) => void = () => {};
  vi.stubGlobal('Element', Loop);
  vi.stubGlobal('HTMLElement', Loop);
  vi.stubGlobal('SVGElement', class {});
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback: IntersectionObserverCallback) {
      notifications.push(visible => callback([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver));
    }
    observe() {}
    disconnect = disconnect;
  });
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: MutationCallback) { mutate = records => callback(records, {} as MutationObserver); }
    observe() {}
    disconnect() {}
  });
  try {
    const cleanup = observeBuiltinLoops(doc as unknown as Document);
    expect(first.dataset.motionRunning).toBe('false');
    notifications[0]?.(true);
    expect(first.dataset.motionRunning).toBe('true');
    mutate([{ type: 'childList', addedNodes: [added] } as unknown as MutationRecord]);
    expect(added.dataset.motionRunning).toBe('false');
    notifications[1]?.(true);
    expect(added.dataset.motionRunning).toBe('true');
    doc.hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(added.dataset.motionRunning).toBe('false');
    first.isConnected = false;
    mutate([]);
    expect(disconnect).toHaveBeenCalledTimes(1);
    added.looping = false;
    mutate([{ type: 'attributes', target: added } as unknown as MutationRecord]);
    expect(disconnect).toHaveBeenCalledTimes(2);
    cleanup();
    expect(disconnect).toHaveBeenCalledTimes(2);
  } finally { vi.unstubAllGlobals(); }
});
