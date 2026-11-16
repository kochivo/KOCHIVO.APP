'use client';

import { Suspense, createContext, lazy, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { uuidv7 } from '@/core/offline/ids';
import { useT } from '@/core/i18n/client';
import { messages } from './messages';
import { topModalDialog } from './modal-host';

import type { ToastIconName } from './toast-icon-names';

// Icons load with the first toast, so the shared first-load bundle stays within budget.
const ToastIcon = lazy(() => import('./toast-icon'));
type Success = { title: string; detail?: string; icon?: ToastIconName };
type Toast = { id: string; text: string; detail?: string; icon: ToastIconName; kind: 'success' | 'error'; leaving: boolean };
type Clock = {
  now: () => number;
  setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
};
type Reason = 'hover' | 'focus';
const clock: Clock = { now: () => Date.now(), setTimer: (callback, delay) => setTimeout(callback, delay), clearTimer: id => clearTimeout(id) };

export function createToastQueue(time: Clock = clock) {
  let items: Toast[] = [];
  const listeners = new Set<() => void>();
  const timers = new Map<string, { timer: ReturnType<typeof setTimeout>; remaining: number; started: number; paused: Set<Reason> }>();
  const emit = () => listeners.forEach(listener => listener());
  const remove = (id: string) => {
    const entry = timers.get(id);
    if (entry) time.clearTimer(entry.timer);
    timers.delete(id); items = items.filter(item => item.id !== id); emit();
  };
  const dismiss = (id: string) => {
    const entry = timers.get(id);
    if (!entry || items.find(item => item.id === id)?.leaving) return;
    time.clearTimer(entry.timer);
    items = items.map(item => item.id === id ? { ...item, leaving: true } : item);
    entry.timer = time.setTimer(() => remove(id), 200); emit();
  };
  const add = (kind: Toast['kind'], input: string | Success) => {
    if (items.length === 3 && items[0]) remove(items[0].id);
    const id = uuidv7(time.now()), remaining = kind === 'error' ? 6000 : 4000;
    const content = typeof input === 'string' ? { title: input } : input;
    items = [...items, { id, kind, text: content.title, detail: content.detail, icon: content.icon ?? 'check', leaving: false }];
    timers.set(id, { timer: time.setTimer(() => dismiss(id), remaining), remaining, started: time.now(), paused: new Set() });
    emit();
  };
  return {
    success: (input: string | Success) => add('success', input), error: (text: string) => add('error', text), dismiss,
    getSnapshot: () => items,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    pause: (id: string, reason: Reason) => {
      const entry = timers.get(id);
      if (!entry || items.find(item => item.id === id)?.leaving) return;
      if (entry.paused.size === 0) {
        time.clearTimer(entry.timer); entry.remaining = Math.max(0, entry.remaining - (time.now() - entry.started));
      }
      entry.paused.add(reason);
    },
    resume: (id: string, reason: Reason) => {
      const entry = timers.get(id);
      if (!entry || items.find(item => item.id === id)?.leaving || !entry.paused.delete(reason) || entry.paused.size > 0) return;
      entry.started = time.now(); entry.timer = time.setTimer(() => dismiss(id), entry.remaining);
    },
    dispose: () => { timers.forEach(entry => time.clearTimer(entry.timer)); timers.clear(); items = []; },
  };
}

type Queue = ReturnType<typeof createToastQueue>;
const missingProvider = () => { throw new Error('ToastProvider is required'); };
const ToastContext = createContext<Pick<Queue, 'success' | 'error'>>({ success: missingProvider, error: missingProvider });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children, queue: injected }: { children?: ReactNode; queue?: Queue }) {
  const [queue] = useState(() => injected ?? createToastQueue());
  const [host, setHost] = useState<Element | null>(null);
  const items = useSyncExternalStore(queue.subscribe, queue.getSnapshot, queue.getSnapshot);
  const t = useT(messages);
  useEffect(() => () => queue.dispose(), [queue]);
  useEffect(() => {
    // Native modal dialogs make outside controls inert, regardless of z-index.
    const update = () => setHost(topModalDialog(document) ?? document.body);
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] });
    update();
    return () => observer.disconnect();
  }, []);
  const stack = <div className="toast-stack pointer-events-none fixed z-50 mx-auto grid w-full max-w-md gap-inline px-page-x">
      {items.map(item => <div key={item.id} role={item.kind === 'error' ? 'alert' : 'status'}
        aria-live={item.kind === 'success' ? 'polite' : undefined} aria-atomic="true"
        onMouseEnter={() => queue.pause(item.id, 'hover')} onMouseLeave={() => queue.resume(item.id, 'hover')}
        onFocus={() => queue.pause(item.id, 'focus')}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) queue.resume(item.id, 'focus'); }}
        className={`glass-strong pointer-events-auto flex items-center gap-stack rounded-control p-stack text-ink ${item.leaving ? 'toast-leave' : 'toast-enter'}`}>
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-control ${item.kind === 'error' ? 'bg-danger-soft text-danger' : 'bg-lime-soft text-lime'}`}><Suspense fallback={null}><ToastIcon name={item.icon} /></Suspense></span>
        <div className="min-w-0 flex-1"><p className="break-words font-semibold">{item.text}</p>
          {item.detail && <p className="truncate text-sm text-muted">{item.detail}</p>}</div>
        <button type="button" aria-label={t('closeNotification')} onClick={() => queue.dismiss(item.id)}
          className="control control-secondary press flex min-h-12 min-w-12 items-center justify-center rounded-control text-muted">
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>)}
    </div>;
  return <ToastContext value={queue}>
    {children}
    {host ? createPortal(stack, host) : stack}
  </ToastContext>;
}
