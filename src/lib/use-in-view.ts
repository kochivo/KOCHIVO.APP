'use client';

import { useCallback } from 'react';

type ObserverFactory = (notify: (visible: boolean) => void) => {
  observe: (element: Element) => void;
  disconnect: () => void;
};

const createObserver: ObserverFactory = notify => new IntersectionObserver(entries => {
  for (const entry of entries) notify(entry.isIntersecting);
});

// Share the imperative lifecycle with tests without needing a DOM renderer or timers.
export function observeInView(element: Element & { dataset: DOMStringMap }, doc: Document,
  factory: ObserverFactory = createObserver) {
  let visible = false;
  let disposed = false;
  const update = () => { element.dataset.motionRunning = String(!disposed && visible && !doc.hidden); };
  update();
  const observer = factory(inView => { visible = inView; update(); });
  observer.observe(element);
  doc.addEventListener('visibilitychange', update);
  return () => {
    disposed = true;
    observer.disconnect();
    doc.removeEventListener('visibilitychange', update);
    element.dataset.motionRunning = 'false';
  };
}

export function useInView<T extends Element & { dataset: DOMStringMap }>(selector?: string) {
  return useCallback((element: T | null) => {
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const targets: (Element & { dataset: DOMStringMap })[] = selector
      ? Array.from(element.querySelectorAll<HTMLElement>(selector)) : [element];
    if (selector && element.matches(selector)) targets.push(element);
    const cleanups = targets.map(target => observeInView(target, document));
    return () => cleanups.forEach(cleanup => cleanup());
  }, [selector]);
}

// Built-in Tailwind loops also occur in lazy loading fallbacks and transient states.
export function observeBuiltinLoops(doc: Document) {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const active = new Map<HTMLElement | SVGElement, () => void>();
  const selector = '[class*="animate-pulse"], [class*="animate-spin"], [class*="animate-bounce"]';
  const enroll = (root: ParentNode) => {
    const elements = Array.from(root.querySelectorAll<HTMLElement | SVGElement>(selector));
    if (root instanceof HTMLElement || root instanceof SVGElement) {
      if (root.matches(selector)) elements.push(root);
    }
    for (const element of elements) {
      if (!active.has(element)) active.set(element, observeInView(element, doc));
    }
  };
  enroll(doc);
  const mutations = new MutationObserver(records => {
    for (const [element, cleanup] of active) {
      if (!element.isConnected || !element.matches(selector)) { cleanup(); active.delete(element); }
    }
    for (const record of records) {
      if (record.type === 'attributes') {
        const element = record.target;
        if ((element instanceof HTMLElement || element instanceof SVGElement) && element.matches(selector) && !active.has(element)) {
          active.set(element, observeInView(element, doc));
        }
      } else for (const node of record.addedNodes) {
        if (node instanceof Element) enroll(node);
      }
    }
  });
  mutations.observe(doc.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  return () => { mutations.disconnect(); active.forEach(cleanup => cleanup()); active.clear(); };
}
