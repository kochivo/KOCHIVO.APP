import { useEffect } from 'react';
import { steps } from './steps';
import { guideSpot } from './guide-spot';
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
      const phone = document.querySelector('.demo-phone')?.getBoundingClientRect();
      const [x, y] = guideSpot(rect, phone, width, height);
      guide.style.insetInlineStart = `${getComputedStyle(guide).direction === 'rtl' ? innerWidth - x - width : x}px`;
      guide.style.top = `${y}px`;
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
