'use client';
import { useEffect, useState } from 'react';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { setLocalUser } from './db';
import { LOCAL_USER_KEY, readRememberedUser, rememberLocalUser } from './remembered-user';

export function useLocalUser() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    let stopped = false;
    let unsubscribe: (() => void) | undefined;
    let owner: string | null = null;
    const revoke = () => {
      setState('loading');
      void setLocalUser(null);
      window.location.reload();
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCAL_USER_KEY && event.newValue !== owner) revoke();
    };
    const initialize = async () => {
      if (stopped) return;
      const client = await loadSupabaseBrowser();
      if (stopped) return;
      unsubscribe?.();
      const listener = client.auth.onAuthStateChange((event, session) => {
        if (stopped || event === 'INITIAL_SESSION') return;
        if (event === 'SIGNED_OUT') { rememberLocalUser(null); revoke(); }
        else if (owner && session?.user.id !== owner) revoke();
      });
      unsubscribe = () => listener.data.subscription.unsubscribe();
      const { data, error } = await client.auth.getSession();
      if (stopped) return;
      if (error && owner) {
        const { readOfflineUser } = await import('@/core/supabase/offline-user');
        if (await readOfflineUser() === owner) return;
        rememberLocalUser(null); revoke(); return;
      }
      if (error || !data.session?.user) {
        rememberLocalUser(null);
        await setLocalUser(null);
        throw new Error('Local session unavailable');
      }
      if (owner && owner !== data.session.user.id) { revoke(); return; }
      owner = data.session.user.id;
      rememberLocalUser(owner);
      await setLocalUser(data.session.user.id);
      if (stopped) return;
      setState('ready');
    };
    const onOnline = () => { void initialize().catch(() => { if (!stopped) setState('error'); }); };
    if (navigator.onLine === false) {
      void import('@/core/supabase/offline-user').then(async ({ readOfflineUser }) => {
        const remembered = readRememberedUser();
        const persisted = await readOfflineUser();
        if (stopped) return;
        // A different account may have signed in through a server action in another tab.
        if (!remembered || persisted !== remembered) { setState('error'); return; }
        owner = remembered;
        await setLocalUser(remembered);
        if (!stopped) setState('ready');
      }).catch(() => { if (!stopped) setState('error'); });
    } else onOnline();
    window.addEventListener?.('storage', onStorage);
    if (navigator.onLine === false) window.addEventListener?.('online', onOnline, { once: true });
    return () => {
      stopped = true; unsubscribe?.();
      window.removeEventListener?.('storage', onStorage);
      window.removeEventListener?.('online', onOnline);
    };
  }, []);
  return state;
}
