'use client';

import { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { themeMode } from '@/lib/theme-mode';
import { messages } from './messages';
import { Segmented } from './segmented';

const keys = { system: 'themeSystem', light: 'themeLight', dark: 'themeDark' } as const;
const values = ['system', 'light', 'dark'] as const;
const snapshot = () => document.documentElement.dataset.themeMode ?? 'system';
const serverSnapshot = () => 'system';
function subscribe(onChange: () => void) {
  window.addEventListener('kochivo:theme-change', onChange);
  return () => window.removeEventListener('kochivo:theme-change', onChange);
}
function select(stored: string) {
  const root = document.documentElement;
  root.dataset.themeMode = stored;
  root.dataset.theme = themeMode({ stored, prefersDark: matchMedia('(prefers-color-scheme: dark)').matches });
  root.style.colorScheme = root.dataset.theme;
  try { localStorage.setItem('kochivo.theme', stored); } catch {
    // Keep the current-page choice usable when browser storage is blocked.
  }
  window.dispatchEvent(new Event('kochivo:theme-change'));
}

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const t = useT(messages);
  const options = [
    { value: values[0], label: t(keys.system) },
    { value: values[1], label: t(keys.light) },
    { value: values[2], label: t(keys.dark) },
  ] as const;
  if (compact) {
    const index = options.findIndex(option => option.value === value);
    const next = options[(index + 1) % options.length] ?? options[0];
    const Icon = value === 'light' ? Sun : value === 'dark' ? Moon : Monitor;
    return <button type="button" className="marketing-ghost min-h-12 min-w-12 rounded-full border border-line"
      aria-label={t('themeCycle', { current: options[index]?.label ?? t('themeSystem'), next: next.label })}
      onClick={() => select(next.value)}><Icon size={20} aria-hidden="true" /></button>;
  }
  return <Segmented aria-label={t('theme')} options={options} value={value} onChange={select} />;
}
