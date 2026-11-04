'use client';
import { useEffect } from 'react';

export function useUnsentVoiceGuard(dirty: boolean, pending: boolean, message: string) {
  useEffect(() => {
    if (!dirty) return;
    const url = window.location.href;
    const state: unknown = window.history.state;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('a[href]')) return;
      if (pending || !window.confirm(message)) { event.preventDefault(); event.stopPropagation(); }
    };
    const traverse = (event: PopStateEvent) => {
      if (!pending && window.confirm(message)) return;
      // Restore this entry before App Router handles a declined same-document traversal.
      event.stopImmediatePropagation();
      window.history.pushState(state, '', url);
    };
    window.addEventListener('beforeunload', unload);
    window.addEventListener('popstate', traverse, true);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      window.removeEventListener('popstate', traverse, true);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty, pending, message]);
  return () => !pending && (!dirty || window.confirm(message));
}
