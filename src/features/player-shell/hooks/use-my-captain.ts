'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { fetchMyCaptain } from '../data/my-captain';
import type { MyCaptain } from '../data/my-captain';
import { localDb } from '@/core/offline/db';
import { internationalEnabled } from '@/lib/international-enabled';
import { profileTimezone } from '@/lib/timezone';

function captainCacheKey() {
  try { return `kochivo.my-captain.${localDb().userId}`; }
  catch { return null; }
}

export function readCaptainCache(): MyCaptain | null {
  try {
    const cacheKey = captainCacheKey();
    if (!cacheKey) return null;
    const value: unknown = JSON.parse(window.localStorage.getItem(cacheKey) ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const row = value as Record<string, unknown>;
    if (typeof row.fullName !== 'string' || typeof row.accessUntil !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.accessUntil) ||
      (row.phone !== null && typeof row.phone !== 'string') ||
      (row.archivedAt !== null && typeof row.archivedAt !== 'string')) return null;
    const branding: Partial<MyCaptain> = {};
    if (typeof row.subscriptionStartsOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.subscriptionStartsOn)) branding.subscriptionStartsOn = row.subscriptionStartsOn;
    if (typeof row.startFormsPending === 'boolean') branding.startFormsPending = row.startFormsPending;
    if (typeof row.captainId === 'string') branding.captainId = row.captainId;
    for (const key of ['bio', 'location', 'avatarUrl'] as const) {
      if (typeof row[key] === 'string' || row[key] === null) branding[key] = row[key];
    }
    if (row.social && typeof row.social === 'object' && !Array.isArray(row.social)) {
      branding.social = Object.fromEntries(Object.entries(row.social).filter(([key, value]) =>
        ['whatsapp', 'instagram', 'tiktok', 'facebook', 'youtube', 'x'].includes(key) && typeof value === 'string'));
    }
    return { fullName: row.fullName, phone: null, accessUntil: row.accessUntil,
      ...(internationalEnabled() ? { timezone: profileTimezone(row.timezone) } : {}),
      ...(typeof row.pending === 'boolean' ? { pending: row.pending } : {}),
      ...(typeof row.frozenAt === 'string' || row.frozenAt === null ? { frozenAt: row.frozenAt } : {}),
      ...(typeof row.awaitingPlansAt === 'string' || row.awaitingPlansAt === null ? { awaitingPlansAt: row.awaitingPlansAt } : {}),
      archivedAt: row.archivedAt, startedOn: null, ...branding };
  } catch { return null; }
}

export function writeCaptainCache(data: MyCaptain | null) {
  try {
    const cacheKey = captainCacheKey();
    if (!cacheKey) return;
    if (!data) { window.localStorage.removeItem(cacheKey); return; }
    const { captainId, fullName, accessUntil, archivedAt, bio, location, avatarUrl, social, pending, frozenAt, awaitingPlansAt, startFormsPending } = data;
    window.localStorage.setItem(cacheKey, JSON.stringify({ captainId, fullName, phone: null, accessUntil, archivedAt, bio, location, avatarUrl, social, pending, frozenAt, awaitingPlansAt, startFormsPending, subscriptionStartsOn: data.subscriptionStartsOn,
      ...(internationalEnabled() ? { timezone: profileTimezone(data.timezone) } : {}) }));
  } catch { /* Storage can be unavailable in private browsing. */ }
}

export function useMyCaptain() {
  const [data, setData] = useState<MyCaptain | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const generation = useRef({ value: 0 });
  const retry = useCallback(async () => {
    const request = ++generation.current.value;
    const ownerKey = captainCacheKey();
    const cached = readCaptainCache();
    setData((current) => current ?? cached);
    if (!navigator.onLine) {
      setData(cached); setStatus('ready'); return;
    }
    setStatus(current => current === 'ready' ? current : 'loading');
    try {
      const result = await fetchMyCaptain();
      if (request !== generation.current.value || ownerKey !== captainCacheKey()) return;
      if ('error' in result) { setStatus(current => current === 'ready' ? current : 'error'); return; }
      setData(result.data); writeCaptainCache(result.data); setStatus('ready');
    } catch { if (request === generation.current.value) setStatus(current => current === 'ready' ? current : 'error'); }
  }, []);
  useEffect(() => {
    const counter = generation.current;
    const initial = counter.value;
    void Promise.resolve().then(() => {
      if (counter.value === initial) return retry();
    });
    window.addEventListener('online', retry);
    window.addEventListener('offline', retry);
    window.addEventListener('focus', retry);
    const refreshVisible = () => { if (!document.hidden && navigator.onLine) void retry(); };
    document.addEventListener('visibilitychange', refreshVisible);
    const interval = window.setInterval(refreshVisible, 30_000);
    return () => {
      counter.value++;
      window.removeEventListener('online', retry);
      window.removeEventListener('offline', retry);
      window.removeEventListener('focus', retry);
      document.removeEventListener('visibilitychange', refreshVisible);
      window.clearInterval(interval);
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
