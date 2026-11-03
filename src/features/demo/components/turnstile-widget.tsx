'use client';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: {
        sitekey: string; callback: (token: string) => void;
        'expired-callback': () => void; 'error-callback': () => void;
      }) => string;
      remove: (id: string) => void;
    };
  }
}
export function TurnstileWidget({ siteKey, onToken, onError }: {
  siteKey: string; onToken: (token: string) => void; onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: string | undefined;
    let active = true;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    const render = () => {
      if (!active || !container.current || !window.turnstile) return;
      id = window.turnstile.render(container.current, {
        sitekey: siteKey, callback: onToken,
        'expired-callback': () => onToken(''), 'error-callback': onError,
      });
    };
    script.onload = render;
    script.onerror = onError;
    if (window.turnstile) render();
    else document.head.appendChild(script);
    return () => {
      active = false;
      if (id !== undefined) window.turnstile?.remove(id);
      script.remove();
    };
  }, [siteKey, onToken, onError]);
  return <div ref={container} aria-label="اتأكد إنك مش روبوت" />;
}
