'use client';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export function PublicDock({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const name = document.getElementById('public-coach-name');
    if (!name) return;
    if (typeof IntersectionObserver === 'undefined') {
      const update = () => setVisible(name.getBoundingClientRect().bottom <= 0);
      update();
      window.addEventListener('scroll', update, { passive: true });
      return () => window.removeEventListener('scroll', update);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0);
    });
    observer.observe(name);
    return () => observer.disconnect();
  }, []);
  return <div hidden={!visible} data-action-bar={visible || undefined} data-public-dock className="public-dock fixed start-0 end-0 bottom-0 z-30 border-t border-line bg-bg-deep md:hidden">
    {children}
  </div>;
}
