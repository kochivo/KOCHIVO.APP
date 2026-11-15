'use client';
import { Button } from './button';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from './tour/messages';
import { nextVisibleStep } from './tour/state';
import { tourGeometry, visibleTarget } from './tour/geometry';
import type { TourStep } from './tour/steps';

export interface TourProps { steps: TourStep[]; onClose: () => void }

export function Tour({ steps, onClose }: TourProps) {
  const t = useT(messages);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [geometry, setGeometry] = useState<ReturnType<typeof tourGeometry> | null>(null);
  const fail = useCallback((error: unknown) => { console.warn('Tour closed after an error', error); onClose(); }, [onClose]);
  const move = useCallback((from: number, direction: 1 | -1) => {
    try {
      const next = nextVisibleStep(steps, from, direction, id => !!visibleTarget(id));
      if (next === null) { if (direction === 1) onClose(); return; }
      setIndex(next);
    } catch (error) { fail(error); }
  }, [steps, onClose, fail]);

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    const frame = requestAnimationFrame(() => {
      try { element?.showModal(); move(-1, 1); }
      catch (error) { fail(error); }
    });
    return () => {
      cancelAnimationFrame(frame);
      element?.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [move, fail]);

  useEffect(() => {
    if (index === null) return;
    const step = steps[index];
    if (!step) return;
    const update = () => {
      try {
        const target = visibleTarget(step.target);
        if (!target) { move(index, 1); return; }
        setGeometry(tourGeometry(target.getBoundingClientRect(), window.innerWidth, window.innerHeight,
          locale === 'ar', card.current?.getBoundingClientRect().height));
      } catch (error) { fail(error); }
    };
    const frame = requestAnimationFrame(() => {
      try {
        visibleTarget(step.target)?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        update(); card.current?.focus();
      } catch (error) { fail(error); }
    });
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    let observer: MutationObserver | undefined;
    try {
      observer = new MutationObserver(update);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'aria-hidden'] });
    } catch (error) { fail(error); }
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [index, steps, locale, move, fail]);

  function keyDown(event: KeyboardEvent<HTMLDialogElement>) {
    try {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (index !== null && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        move(index, (event.key === 'ArrowRight') === (locale !== 'ar') ? 1 : -1);
      }
      if (event.key === 'Tab') {
        const buttons = Array.from(card.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const position = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.shiftKey ? (position <= 0 ? buttons.length - 1 : position - 1) : (position + 1) % buttons.length;
        event.preventDefault(); buttons[next]?.focus();
      }
    } catch (error) { fail(error); }
  }
  const step = index === null ? undefined : steps[index];
  const previous = index === null ? null : nextVisibleStep(steps, index, -1, id => !!visibleTarget(id));
  const next = index === null ? null : nextVisibleStep(steps, index, 1, id => !!visibleTarget(id));
  const style = geometry ? { '--tour-start': `${geometry.cardStart}px`, '--tour-top': `${geometry.cardTop}px`,
    '--tour-bottom': `${geometry.cardBottom}px` } as CSSProperties : undefined;
  return <dialog ref={dialog} aria-labelledby="tour-title" aria-describedby="tour-body"
    onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={keyDown}
    className="fixed inset-0 m-0 h-dvh w-screen max-w-none overflow-hidden border-0 bg-transparent text-ink backdrop:bg-transparent"
    style={{ maxBlockSize: 'none', padding: 0 }}>
    {geometry && <div aria-hidden className="pointer-events-none fixed rounded-control border-2 border-lime"
      style={{ ...geometry.ring, boxShadow: '0 0 0 100vmax color-mix(in srgb, var(--color-bg-deep) 80%, transparent)' }} />}
    {step && <div ref={card} tabIndex={-1} style={style}
      className="enter sheet fixed start-4 end-4 bottom-[var(--tour-bottom,1rem)] max-h-[calc(100dvh-var(--tour-bottom,1rem)-2rem)] overflow-auto rounded-card p-card pb-[max(1.25rem,env(safe-area-inset-bottom))] text-start outline-none sm:start-[var(--tour-start)] sm:end-auto sm:top-[var(--tour-top)] sm:bottom-auto sm:max-h-[75dvh] sm:w-88">
      <p className="text-xs text-muted">{t('progress', { current: formatNumber((index ?? 0) + 1, locale), total: formatNumber(steps.length, locale) })}</p>
      <h2 id="tour-title" className="mt-inline text-xl font-bold">{step.title}</h2>
      <p id="tour-body" className="mt-inline text-sm text-muted">{step.body}</p>
      <div className="mt-card-gap flex flex-wrap gap-inline">
        <Button variant="secondary" className="min-h-12 rounded-control px-stack text-sm text-muted" onClick={onClose}>{t('skip')}</Button>
        <Button variant="secondary" className="ms-auto min-h-12 rounded-control px-stack text-sm disabled:opacity-40" disabled={previous === null} onClick={() => index !== null && move(index, -1)}>{t('back')}</Button>
        <button className="min-h-12 rounded-control bg-lime px-page-x font-bold text-on-lime" onClick={() => index !== null && move(index, 1)}>{t(next === null ? 'done' : 'next')}</button>
      </div>
    </div>}
  </dialog>;
}
