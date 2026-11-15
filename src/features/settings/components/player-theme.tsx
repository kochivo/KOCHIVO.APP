'use client';
import { useSyncExternalStore } from 'react';
import { useT } from '@/core/i18n/client';
import { themeMode } from '@/lib/theme-mode';
import { messages } from '../player-messages';

const subscribe = (change: () => void) => {
  window.addEventListener('kochivo:theme-change', change);
  return () => window.removeEventListener('kochivo:theme-change', change);
};
const snapshot = () => document.documentElement.dataset.theme ?? 'dark';
function select(stored: 'light' | 'dark') {
    const root = document.documentElement;
    root.dataset.themeMode = stored;
    root.dataset.theme = themeMode({ stored, prefersDark: matchMedia('(prefers-color-scheme: dark)').matches });
    root.style.colorScheme = root.dataset.theme;
    try { localStorage.setItem('kochivo.theme', stored); } catch { /* Keep the choice usable with blocked storage. */ }
    window.dispatchEvent(new Event('kochivo:theme-change'));
}

export function PlayerTheme() {
  const t = useT(messages);
  const value = useSyncExternalStore(subscribe, snapshot, () => 'dark');
  return <div className="flex min-h-[60px] items-center gap-stack px-page-x">
    <span className="flex-1 text-sm">{t('theme')}</span>
    <div role="group" aria-label={t('theme')} className="flex rounded-full bg-surface-raised p-inline">
      {(['dark', 'light'] as const).map(option => <button key={option} type="button" aria-pressed={value === option}
        onClick={() => select(option)} className="min-h-12 rounded-full px-stack font-sans text-xs text-muted aria-pressed:bg-ink aria-pressed:font-extrabold aria-pressed:text-bg">
        {t(option)}</button>)}
    </div>
  </div>;
}
