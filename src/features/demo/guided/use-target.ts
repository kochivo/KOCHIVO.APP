import { useEffect } from 'react';
import { steps } from './steps';
import type { DemoState } from './state';

export function useTarget(state: DemoState) {
  useEffect(() => {
    if (state.intro || state.guide !== 'open') return;
    const target = steps[state.step]?.target;
    let highlighted: Element | null = null;
    const place = () => {
      const guide = document.querySelector<HTMLElement>('[data-guide]');
      if (!guide || innerWidth < 980) return;
      const rect = highlighted?.getBoundingClientRect();
      const width = guide.offsetWidth, height = guide.offsetHeight;
      let x = (innerWidth - width) / 2, y = (innerHeight - height) / 2;
      if (rect) {
        x = rect.x > width + 32 ? rect.x - width - 16 : rect.x + rect.width + 16;
        if (x + width > innerWidth - 16) x = Math.max(16, rect.x + rect.width / 2 - width / 2);
        y = rect.y + rect.height / 2 - height / 2;
      }
      const physicalX = Math.max(16, Math.min(innerWidth - width - 16, x));
      guide.style.insetInlineStart = `${getComputedStyle(guide).direction === 'rtl' ? innerWidth - physicalX - width : physicalX}px`;
      guide.style.top = `${Math.max(90, Math.min(innerHeight - height - 16, y))}px`;
      guide.style.bottom = 'auto';
    };
    const find = () => {
      const el = target ? document.querySelector(`[data-demo-target="${target}"]`) : null;
      if (!el || el === highlighted) { place(); return; }
      highlighted?.classList.remove('demo-target'); highlighted = el;
      el.classList.add('demo-target');
      if (el instanceof HTMLElement) el.style.scrollMarginBlockStart = `${(document.querySelector('[data-demo-header]')?.getBoundingClientRect().height ?? 80) + 12}px`;
      el.scrollIntoView({ block: innerWidth < 980 ? 'start' : 'nearest', behavior: 'instant' });
      place();
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.querySelector('[data-demo-stage]') ?? document.body, { childList: true, subtree: true });
    const resize = () => {
      const guide = document.querySelector<HTMLElement>('[data-guide]');
      if (guide && innerWidth < 980) { guide.style.removeProperty('inset-inline-start'); guide.style.removeProperty('top'); guide.style.removeProperty('bottom'); }
      place();
    };
    window.addEventListener('resize', resize); document.addEventListener('scroll', place, true);
    return () => { observer.disconnect(); highlighted?.classList.remove('demo-target'); window.removeEventListener('resize', resize); document.removeEventListener('scroll', place, true); };
  }, [state.intro, state.step, state.page, state.view, state.guide]);
}
