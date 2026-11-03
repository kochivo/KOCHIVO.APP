'use client';

import { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { themeMode } from '@/lib/theme-mode';
import { Segmented } from './segmented';

const options = [
  { value: 'system', label: 'جهازك' },
  { value: 'light', label: 'فاتح' },
  { value: 'dark', label: 'غامق' },
] as const;
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
  if (compact) {
    const index = options.findIndex(option => option.value === value);
    const next = options[(index + 1) % options.length] ?? options[0];
    const Icon = value === 'light' ? Sun : value === 'dark' ? Moon : Monitor;
    return <button type="button" className="marketing-ghost min-h-12 min-w-12"
      aria-label={`شكل التطبيق: ${options[index]?.label ?? 'جهازك'}، غيّر لـ${next.label}`}
      onClick={() => select(next.value)}><Icon size={20} aria-hidden="true" /></button>;
  }
  return <Segmented aria-label="شكل التطبيق" options={options} value={value} onChange={select} />;
}
