'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchMyCaptain } from '../data/my-captain';
import type { MyCaptain } from '../data/my-captain';

const cacheKey = 'kochivo.my-captain';

export function readCaptainCache(): MyCaptain | null {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(cacheKey) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    if (typeof row.fullName !== 'string' || typeof row.accessUntil !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.accessUntil) ||
      (row.phone !== null && typeof row.phone !== 'string') ||
      (row.archivedAt !== null && typeof row.archivedAt !== 'string')) return null;
    const branding: Partial<MyCaptain> = {};
    for (const key of ['bio', 'location', 'avatarUrl'] as const) {
      if (typeof row[key] === 'string' || row[key] === null) branding[key] = row[key];
    }
    if (row.social && typeof row.social === 'object' && !Array.isArray(row.social)) {
      branding.social = Object.fromEntries(Object.entries(row.social).filter(([key, value]) =>
        ['whatsapp', 'instagram', 'tiktok', 'facebook', 'youtube', 'x'].includes(key) && typeof value === 'string'));
    }
    return { fullName: row.fullName, phone: null, accessUntil: row.accessUntil,
      archivedAt: row.archivedAt, startedOn: null, ...branding };
  } catch { return null; }
}

export function writeCaptainCache(data: MyCaptain | null) {
  try {
    if (!data) { window.localStorage.removeItem(cacheKey); return; }
    const { fullName, accessUntil, archivedAt, bio, location, avatarUrl, social } = data;
    window.localStorage.setItem(cacheKey, JSON.stringify({ fullName, phone: null, accessUntil, archivedAt, bio, location, avatarUrl, social }));
  } catch { /* Storage can be unavailable in private browsing. */ }
}

export function useMyCaptain() {
  const [data, setData] = useState<MyCaptain | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const generation = useRef({ value: 0 });
  const retry = useCallback(async () => {
    const request = ++generation.current.value;
    const cached = readCaptainCache();
    setData((current) => current ?? cached);
    if (!navigator.onLine) {
      setData(cached); setStatus('ready'); return;
    }
    setStatus('loading');
    try {
      const result = await fetchMyCaptain();
      if (request !== generation.current.value) return;
      if ('error' in result) { setStatus('error'); return; }
      setData(result.data); writeCaptainCache(result.data); setStatus('ready');
    } catch { if (request === generation.current.value) setStatus('error'); }
  }, []);
  useEffect(() => {
    const counter = generation.current;
    const initial = counter.value;
    void Promise.resolve().then(() => {
      if (counter.value === initial) return retry();
    });
    window.addEventListener('online', retry);
    window.addEventListener('offline', retry);
    return () => {
      counter.value++;
      window.removeEventListener('online', retry);
      window.removeEventListener('offline', retry);
    };
  }, [retry]);
  return { data, status, retry };
}

export const MyCaptainContext = createContext<ReturnType<typeof useMyCaptain> | null>(null);
export function useCaptainContext() {
  const captain = useContext(MyCaptainContext);
  if (!captain) throw new Error('PlayerShell is required');
  return captain;
}
