'use client';

import { createContext, useContext, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import { joinWaitlist } from '../data/waitlist';

type Status = 'waitlisted' | 'member' | 'failure' | null;
const Waitlist = createContext({ pending: false, status: null as Status, submit: () => {} });

export function usePublicWaitlist() {
  return useContext(Waitlist);
}

export function PublicWaitlistProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<Status>(null);
  const submitting = useRef(false);
  function submit() {
    if (submitting.current || status === 'waitlisted' || status === 'member') return;
    submitting.current = true;
    start(async () => {
      try {
        const result = await joinWaitlist(slug);
        if (result.redirect) { window.location.assign(result.redirect); return; }
        setStatus(result.status ?? 'failure');
      } catch { setStatus('failure'); }
      finally { submitting.current = false; }
    });
  }
  return <Waitlist.Provider value={{ pending, status, submit }}>{children}</Waitlist.Provider>;
}
