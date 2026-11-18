'use client';

import { useEffect } from 'react';

/** iOS changes the visual viewport without resizing the layout viewport for its keyboard. */
export function MobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = document.documentElement;
        const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
        const field = document.activeElement;
        const editable = field instanceof HTMLElement && field.matches('input, textarea, select');
        const unzoomed = Math.abs(viewport.scale - 1) < 0.01;
        // Pinch zoom and small browser-toolbar shifts must not reposition modal sheets.
        const keyboard = editable && unzoomed && inset > 100;
        if (keyboard) root.style.setProperty('--visible-viewport-height', `${viewport.height}px`);
        else root.style.removeProperty('--visible-viewport-height');
        root.style.setProperty('--keyboard-inset', `${keyboard ? inset : 0}px`);
        // After the keyboard closes iOS can leave the visual viewport scrolled below the layout
        // viewport, which lifts every fixed bar (bottom nav, safe-top strip) off the screen edge.
        const shift = !keyboard && unzoomed ? Math.max(0, Math.round(viewport.offsetTop)) : 0;
        if (shift) root.style.setProperty('--viewport-shift', `${shift}px`);
        else root.style.removeProperty('--viewport-shift');
        root.dataset.keyboard = keyboard ? 'open' : 'closed';
        if (editable && unzoomed) {
          field.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      });
    };
    // Re-applying the current scroll position makes iOS settle the stuck viewport once the keyboard is gone.
    const settle = () => {
      update();
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement && document.activeElement.matches('input, textarea, select')) return;
        window.scrollTo(window.scrollX, window.scrollY);
        update();
      }, 300);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', settle);
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', settle);
      document.documentElement.style.removeProperty('--visible-viewport-height');
      document.documentElement.style.removeProperty('--keyboard-inset');
      document.documentElement.style.removeProperty('--viewport-shift');
      delete document.documentElement.dataset.keyboard;
    };
  }, []);
  return null;
}
